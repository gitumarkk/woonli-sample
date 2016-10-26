// Meteor
import { Meteor } from 'meteor/meteor';

// App
import { Organization } from '../organization/collections.js';
import { Project } from '../project/collections.js';
import { AsanaData } from '../asana/collections.js';
import { AsanaHelper as AH } from './helpers.js';
import { DataProcessHelper as DPH } from '../../helpers/dataprocessV2.js';

// NPM
import Future from 'fibers/future';
import lodash from 'lodash';
import moment from 'moment';
import Asana from 'asana';

const createClient = function() {
    const _asana = Meteor.settings.asana;
    const client = Asana.Client.create({
        clientId: _asana.clientId,
        clientSecret: _asana.clientSecret,
        redirectUri: Meteor.settings.base.siteUrl + _asana.redirectPath,
        asanaBaseUrl: "https://app.asana.com/",
        retryOnRateLimit: true
    });

    return client;
};

Meteor.methods({
    "asana:get:authorizeUrl"() {
        return `${createClient().app.asanaAuthorizeUrl()}&state=${this.userId}`;
    },

    /**
    * @summary Initializes the asana users sync and the data sync
    */
    "asana:sync:initial"(_userId) {
        this.unblock();

        const userId = _userId || this.userId;
        console.log("asana:sync:initial");

        // If not user id don't throw error but return
        if (!userId) return;

        // Making this run asynchronoulsy, needs to pass user id as the user session is not passed into the
        // setTimeout
        // Meteor.setTimeout(function() {
        // Defer the call asynchronously
        Meteor.defer(() => {
            Meteor.call("asana:get:users", userId, function(error) {
                if (!error) {
                    Meteor.call("asana:get:details", userId, function(error2) {
                        if (error2) throw new Meteor.Error(error2);
                    });
                } else {
                    console.error(error);
                    throw new Meteor.Error(error);
                }
            });
        });
        // }, 1000);
    },

    "asana:disconnect"() {
        if (!this.userId) {
            throw new Meteor.Error("You need to be logged in to disconnect and account.");
        }

        const user = Meteor.users.findOne({
            _id: this.userId
        });
        const org = Organization.findOne({
            _id: user.profile.current_organization
        });
        const projectId = user.profile.current_project;
        const project = Project.findOne({
            _id: projectId
        });

        if (org) {
            Organization.update(org._id, {
                $unset: {
                    "integrations.asana.credentials": "",
                    "integrations.asana.token": ""
                }
            });

            Organization.update(org._id, {
                $set: {
                    "integrations.asana.isConnected": false
                }
            });
        }

        if (project) {
            Project.update(projectId, {
                $set: {
                    "integrations.asana.isConnected": false
                }
            });
        }
    },

    "asana:get:credentials"(userId) {
        this.unblock();
        const client = createClient();
        const user = Meteor.users.findOne({
            _id: userId
        });
        const org = Organization.findOne({
            _id: user.profile.current_organization
        });
        const projectId = user.profile.current_project;
        const project = Project.findOne({
            _id: projectId
        });
        const myFuture = new Future();

        if (org) {
            client.app.accessTokenFromCode(org.integrations.asana.token).then(function(credentials) {
                myFuture.return(credentials);
            });

            Organization.update(org._id, {
                $set: {
                    "integrations.asana.credentials": myFuture.wait(),
                    "integrations.asana.isConnected": true,
                    "integrations.asana.syncError": false
                }
            });

            if (project) {
                Project.update(projectId, {
                    $set: {
                        "integrations.asana.isConnected": true,
                        "integrations.asana.syncError": false
                    }
                });
            }
            // Running in this set timeout function so it can be async
            Meteor.call("asana:get:workspace", userId);
        }
    },

    "asana:get:workspace"(_userId) {
        const userId = _userId || this.userId;
        const user = Meteor.users.findOne({
            _id: userId
        });
        const org = Organization.findOne({
            _id: user.profile.current_organization
        });

        if (!org && !user.integrations && !user.integrations.asana && !org.integrations.asana.token) {
            throw new Meteor.Error("User does not exist or have a valid token");
        }

        const client = createClient();
        const tokenFuture = new Future();

        client.app.accessTokenFromRefreshToken(org.integrations.asana.credentials.refresh_token).then(function(credentials) {
            tokenFuture.return(credentials);
        }).catch(function(error) {
            tokenFuture.throw(error);
        });

        const credentials = tokenFuture.wait();

        Organization.update(org._id, {
            $set: {
                "integrations.asana.credentials.access_token": credentials.access_token,
                "integrations.asana.isFetching": true
            }
        });

        client.useOauth({
          credentials: credentials.access_token
        });

        const userFuture = new Future();

        client.users.me().then(function(user) {
            userFuture.return(user);
        });

        const user_data = userFuture.wait();

        Organization.update(org._id, {
            $set: {
                "integrations.asana.workspaces": user_data.workspaces,
                "integrations.asana.isFetching": false
            }
        });
    },

    "asana:set:default"(workspaceId, _userId) {
        const userId = _userId || this.userId;
        if (!userId) {
            throw new Meteor.Error("You need to be logged in to create a board");
        }
        const user = Meteor.users.findOne({
            _id: userId
        });

        if (user && user.profile.current_organization && user.profile.current_project) {
            const org = Organization.findOne({
                _id: user.profile.current_organization
            });
            const projectId = user.profile.current_project;
            const project = Project.findOne({
                _id: projectId
            });

            console.log(workspaceId);

            if (org && org.integrations.asana && org.integrations.asana.workspaces && project) {
                const defaultWorkspace = lodash.find(org.integrations.asana.workspaces,
                    { id: Number(workspaceId) });

                Project.update(project._id, {
                    $set: {
                        "integrations.asana.defaultWorkspace": defaultWorkspace
                    }
                });

                Meteor.call("asana:sync:initial", function(error) {
                    if (error) throw new Meteor.Error(error);
                });
            }
        } else {
            throw new Meteor.Error("User, organization or project not set");
        }
    },

    "asana:get:users"(_userId){
        this.unblock();
        const userId = _userId || this.userId;
        const user = Meteor.users.findOne({
            _id: userId
        });
        const org = Organization.findOne({
            _id: user.profile.current_organization
        });
        const projectId = user.profile.current_project;
        const project = Project.findOne({
            _id: projectId
        });

        if (!org || !org.integrations.asana.token) {
            throw new Meteor.Error("User does not exist or have a valid token");
        }

        if (!project) {
            throw new Meteor.Error("No project has been set.");
        }

        if (!project.integrations.asana.defaultWorkspace) {
            throw new Meteor.Error("Default workspace is not set, please set in order to integrate");
        }

        Organization.update(org._id, {
            $set: {
                "integrations.asana.isFetching": true
            }
        });

        Project.update(projectId, {
            $set: {
                "integrations.asana.isFetching": true
            }
        });

        const client = createClient();
        const tokenFuture = new Future();

        client.app.accessTokenFromRefreshToken(org.integrations.asana.credentials.refresh_token).then(function(credentials) {
            tokenFuture.return(credentials);
        }).catch(function(error) {
            tokenFuture.throw(error);
        });

        let credentials;

        try {
            credentials = tokenFuture.wait();
        } catch (error) {
            const data = {
                "integrations.asana.isFetching": false
            };

            try {
                let errorJSON = JSON.parse(error);

                if (errorJSON.error && errorJSON.error === "invalid_client") {
                    data["integrations.asana.syncError"] = errorJSON;
                    data["integrations.asana.isConnected"] = false;

                    Organization.update(org._id, {
                        $unset: {
                            "integrations.asana.credentials": "",
                            "integrations.asana.token": ""

                        }
                    });
                }
                Meteor.call("email:send:error", userId, org._id, errorJSON);
            } catch (e) {
                console.error(e);
            }

            Organization.update(org._id, {
                $set: data
            });

            Project.update(projectId, {
                $set: data
            });
            throw new Meteor.Error(error);
        }

        if (!credentials) throw new Meteor.Error("Credentials not found");

        Organization.update(org._id, {
            $set: {
                "integrations.asana.credentials.access_token": credentials.access_token
            }
        });

        client.useOauth({
          credentials: credentials.access_token
        });

        const usersFuture = new Future();
        const workspaceId = project.integrations.asana.defaultWorkspace.id;

        client.users.findByWorkspace(workspaceId, {
            opt_fields: 'id,name,email,photo'
        }).then(function(users){
            usersFuture.return(users);
        }).catch(function(error) {
            usersData.throw(error);
        });

        const usersData = usersFuture.wait();
        let orgUsers = [];

        if (project.integrations && project.integrations.asana && project.integrations.asana.users) {
            orgUsers = lodash.chain(lodash.flatten(usersData.data, project.integrations.asana.users)).
                sortBy("id", "totalEvents").
                uniq(x => x.id ).
                value();
        } else {
            orgUsers = usersData.data;
        }

        Organization.update(org._id, {
            $set: {
                "integrations.asana.isFetching": false
            }
        });

        Project.update(projectId, {
            $set: {
                "integrations.asana.users": orgUsers,
                "integrations.asana.isFetching": false
            }
        });

        const dbAsanaData = AsanaData.findOne({
            organizationId: org._id,
            projectId,
        });

        if (!dbAsanaData) {
            AsanaData.insert({
                organizationId: org._id,
                projectId,
                data: {},
                createdBy: userId,
                members: usersData.data,
                lastSyncDate: moment().toDate()
            });
        } else {
            const mData = lodash.chain(usersData.data)
                .map(x => lodash.extend(x, lodash.find(dbAsanaData.members, { memberId: x.id }) || {}))
                .value();

            mData.concat(lodash.differenceWith(dbAsanaData.members, usersData.data, (x1, x2) => x1.memberId === x2.memberId));
            AsanaData.update(dbAsanaData._id, {
                $set: {
                    members: mData,
                }
            });
        }
    },


    "asana:get:details"(_userId) {
        this.unblock();
        const userId = _userId || this.userId;
        const user = Meteor.users.findOne({
            _id: userId
        });
        const org = Organization.findOne({
            _id: user.profile.current_organization
        });
        const projectId = user.profile.current_project;
        const project = Project.findOne({
            _id: projectId
        });

        if (!org &&
            !user.integrations &&
            !user.integrations.asana &&
            !org.integrations.asana.token &&
            !org.integrations.asana.credentials) {
            throw new Meteor.Error("User does not exist or have a valid token");
        }

        if (!project) {
            throw new Meteor.Error("No project has been set.");
        }

        if (!project.integrations.asana.defaultWorkspace) {
            throw new Meteor.Error("Default workspace is not set, please set in order to integrate");
        }

        const client = createClient();
        const tokenFuture = new Future();

        client.app.accessTokenFromRefreshToken(org.integrations.asana.credentials.refresh_token).then(function(credentials) {
            tokenFuture.return(credentials);
        }).catch(function(error) {
            tokenFuture.throw(error);
        });

        let credentials;

        try {
            credentials = tokenFuture.wait();
        } catch (error) {
            let data = {
                "integrations.asana.isFetching": false
            };

            try {
                let errorJSON = JSON.parse(error);

                if (errorJSON.error && errorJSON.error === "invalid_client") {
                    data["integrations.asana.syncError"] = errorJSON;
                    data["integrations.asana.isConnected"] = false;

                    Organization.update(org._id, {
                        $unset: {
                            "integrations.asana.credentials": "",
                            "integrations.asana.token": ""
                        }
                    });
                }

                Meteor.call("email:send:error", userId, org._id, errorJSON);
            } catch (e) {
                console.error(e);
            }

            Organization.update(org._id, {
                $set: data
            });

            Project.update(projectId, {
                $set: data
            });

            throw new Meteor.Error(error);
        }

        if (!credentials) throw new Meteor.Error("Credentials not found");

        const _data = {
            "integrations.asana.credentials.access_token": credentials.access_token,
            "integrations.asana.isFetching": true
        };

        Organization.update(org._id, {
            $set: _data
        });

        Project.update(projectId, {
            $set: {
                "integrations.asana.isFetching": true
            }
        });

        client.useOauth({
          credentials: credentials.access_token
        });

        const _f = new Future();
        const workspaceId = project.integrations.asana.defaultWorkspace.id;

        // Get users by workspace
        client.projects.findByWorkspace(workspaceId, {
            opt_fields: 'id,name'
        }).then(function(prjs){
            _f.return(prjs);
        }).catch(function(error) {
            _f.throw(error);
        });

        const workspaceProjects = _f.wait();
        const allTasks = [];

        lodash.each(workspaceProjects.data, (proj) => {
            const _tF = new Future();
            const asanaProjectId = proj.id;
            console.log(asanaProjectId);

            const queryParams = {
                project: asanaProjectId,
                workspace: workspaceId,
                opt_fields: 'id,created_at,completed,completed_at,due_on,due_at,external,name,projects,assignee',
                opt_expand: 'assignee'

            };

            // if (project.integrations.asana.lastFetch) {  // Getting from 2 days ago
            //     queryParams.completed_since = moment(project.integrations.asana.lastFetch).
            //         subtract(2, 'days').
            //         format();
            // }

            // Incase you hit rate limits don't want the data which has already been fetched to be invalidated.
            try {
                client.tasks.findAll(queryParams).then(function(taskscollection) {
                    taskscollection.fetch().then(function(tasks) {
                        _tF.return(tasks);
                    });
                });

                const _tasks = _tF.wait();

                lodash.each(_tasks, (x, i) => {
                    _tasks[i].user = user;
                });
                allTasks.push.apply(allTasks, _tasks);
            } catch(error) {

            }
        });

        const datastruct = {};
        const allGroupedTasks = lodash.chain(allTasks)
            .groupBy((x) => moment(x.created_at).format("YYYY-MM-DD"))
            .map((v, k) => [k, v])
            .sortBy((x) => moment(x[0]))
            .value();

        const template = {
            completedTotal: 0,
            createdTotal: 0,
            assigned: 0,
            unassigned: 0,
            tasksPendingTotal: 0,
            deadline: {
                early: 0,
                late: 0,
                ontime: 0,
                noDeadline: 0
            }
        };

        const snapshotTemplate = lodash.cloneDeep(lodash.extend({}, template));
        const memberTemplate = lodash.cloneDeep(lodash.extend({memberId: "", total: 0}, template));
        const asanaMembers = [];

        const projectsList = lodash.chain(workspaceProjects.data)
            .map((x) => { return lodash.extend({ id: x.id, name: x.name, members: []}, snapshotTemplate); })
            .cloneDeep()
            .value()

        lodash.each(allGroupedTasks, (group, index) => {
            const date = group[0];
            const tasks = lodash.sortBy(group[1], (x) => moment(x.date));
            const snapshot = lodash.chain(projectsList)
                .map((x) => { x.date = date; return x; })
                .cloneDeep()
                .value();

            lodash.each(tasks, (tsk) => {
                const memberId = tsk.assignee && tsk.assignee.id || "UNASSIGNED";

                // Loop through the projects id and save it in the snapshot data
                lodash.each(tsk.projects, (proj, k) => {
                    const listIndex = lodash.findIndex(snapshot, { id: proj.id });

                    if (listIndex !== -1) {
                        snapshot[listIndex].createdTotal += 1;

                        if (tsk.assignee) {
                            snapshot[listIndex].assigned += 1;
                        } else {
                            snapshot[listIndex].unassigned += 1;
                        }

                        if (!tsk.completed) {
                            snapshot[listIndex].tasksPendingTotal += 1
                        }

                        const memberIndex =  lodash.findIndex(snapshot[listIndex].members, { memberId: memberId });
                        if (memberIndex !== -1) {
                            snapshot[listIndex].members[memberIndex].assigned += 1;
                            snapshot[listIndex].members[memberIndex].total += 1;

                            if (!tsk.completed) {
                                snapshot[listIndex].members[memberIndex].tasksPendingTotal += 1;
                            }
                        } else {
                            const m = lodash.cloneDeep(memberTemplate);
                            m.memberId = memberId;
                            m.assigned = 1; // Not created as the memberId is the assingee task
                            if (!tsk.completed) {
                                m.tasksPendingTotal = 1;
                            }
                            snapshot[listIndex].members.push(m);
                        }

                        // Save the global members data
                        const _mi = lodash.findIndex(asanaMembers, {
                            memberId: memberId
                        });

                        // Integration total
                        if ( _mi === -1) {
                            const _m1 = lodash.cloneDeep(memberTemplate);
                            _m1.memberId = memberId;
                            _m1.assigned = 1; // Not created as the memberId is the assingee task
                            _m1.total = 1; // To allow for future filtering
                            if (!tsk.completed) {
                                _m1.tasksPendingTotal = 1;
                            }

                            asanaMembers.push(_m1);
                        } else {
                            asanaMembers[_mi].assigned += 1;
                            asanaMembers[_mi].total += 1;

                            if (!tsk.completed) {
                                asanaMembers[_mi].tasksPendingTotal += 1;
                            }
                        }
                    } else {
                        // Maybe add new project if doesn't exist
                    }
                });
            });

            datastruct[date] = lodash.cloneDeep(snapshot);
        });

        const allCompletedTasks = lodash.chain(allTasks)
            .filter((x) => x.completed)
            .groupBy((x) => moment(x.completed_at).format("YYYY-MM-DD"))
            .map((v, k) => [k, v])
            .sortBy((x) => moment(x[0]))
            .value();

        lodash.each(allCompletedTasks, (group, index) => {
            const date = group[0];
            const tasks = lodash.sortBy(group[1], (x) => moment(x.date));
            const snapshot = datastruct[date] ? lodash.cloneDeep(datastruct[date]) : lodash.map(projectsList, (x) => {
                x.date = date;
                return x;
            });

            lodash.each(tasks, (tsk) => {
                const memberId = tsk.assignee && tsk.assignee.id || "UNASSIGNED";

                // Loop through the projects id and save it in the snapshot data
                lodash.each(tsk.projects, (proj, k) => {
                    let listIndex = -1;
                    listIndex = lodash.findIndex(snapshot, { id: proj.id });

                    if (listIndex !== -1) {
                        snapshot[listIndex].completedTotal += 1;

                        const memberDeadline = {
                            early: 0,
                            late: 0,
                            ontime: 0,
                            noDeadline: 0
                        };

                        if (tsk.due_on) {
                            const diffDays = moment(date).diff(moment(tsk.due_on), "days");

                            if (diffDays > 0) { // Late
                                snapshot[listIndex].deadline.late += 1;
                                memberDeadline.late = 1;
                                // snapshot[listIndex]["deadline"]["lateAvg"] = diffDays > 0 ? (snapshot[listIndex]["deadline"]["lateAvg"] + 1) : snapshot[listIndex]["late"];
                            } else if (0 < diffDays) { // Early
                                snapshot[listIndex].deadline.early += 1;
                                memberDeadline.early = 1;
                            } else { //
                                snapshot[listIndex].deadline.ontime += 1;
                                memberDeadline.ontime = 1;
                            }
                        } else {
                            snapshot[listIndex].deadline.noDeadline += 1;
                            memberDeadline.noDeadline = 1;
                        }

                        const memberIndex =  lodash.findIndex(snapshot[listIndex].members, { memberId });

                        if (memberIndex !== -1) {
                            // Assume it has not been through this before, but memberId exits
                            snapshot[listIndex].members[memberIndex].completedTotal += 1;
                            snapshot[listIndex].members[memberIndex].deadline.late += memberDeadline.late;
                            snapshot[listIndex].members[memberIndex].deadline.early += memberDeadline.early;
                            snapshot[listIndex].members[memberIndex].deadline.ontime += memberDeadline.ontime;
                            snapshot[listIndex].members[memberIndex].deadline.noDeadline += memberDeadline.noDeadline;
                        } else {
                            const m = lodash.cloneDeep(memberTemplate);
                            m.memberId = memberId;
                            m.completedTotal += 1;
                            m.deadline.late = memberDeadline.late;
                            m.deadline.early = memberDeadline.early;
                            m.deadline.ontime = memberDeadline.ontime;
                            m.deadline.noDeadline = memberDeadline.noDeadline;
                            snapshot[listIndex].members.push(m);
                        }

                         // Save the global members data
                        const _mi = lodash.findIndex(asanaMembers, { memberId });

                        // Integration total
                        if ( _mi !== -1) {
                            asanaMembers[_mi].total += 1;
                            asanaMembers[_mi].completedTotal += 1;
                            asanaMembers[_mi].deadline.late += memberDeadline.late;
                            asanaMembers[_mi].deadline.early += memberDeadline.early;
                            asanaMembers[_mi].deadline.ontime += memberDeadline.ontime;
                            asanaMembers[_mi].deadline.noDeadline += memberDeadline.noDeadline;
                        } else {
                            const _m1 = lodash.cloneDeep(memberTemplate);
                            _m1.memberId = memberId;
                            _m1.total = 1; // To allow for future filtering
                            _m1.completedTotal = 1; // Not created as the memberId is the assingee task
                            _m1.deadline.late = memberDeadline.late;
                            _m1.deadline.early = memberDeadline.early;
                            _m1.deadline.ontime = memberDeadline.ontime;
                            _m1.deadline.noDeadline = memberDeadline.noDeadline;
                            asanaMembers.push(_m1);
                        }
                    } else {
                        // Maybe add new project if doesn't exist
                    }
                });
            });

            datastruct[date] = lodash.cloneDeep(snapshot);
        });

        const dbAsanaData = AsanaData.findOne({
            organizationId: org._id,
            projectId,
        });

        let trimmedData;
        if (Object.keys(datastruct).length > 30 * 6) {
            trimmedData = lodash.chain(datastruct)
                .map((v, k) => [k, v])
                .sortBy((x) => moment(x[0]))
                .takeRight(30 * 6)
                .transform((result, x) => result[x[0]] = x[1], {})
                .value();
        } else {
            trimmedData = datastruct;
        }

        if (!dbAsanaData) {
            console.log("Asana saving");
            AsanaData.insert({
                organizationId: org._id,
                projectId,
                data: trimmedData,
                createdBy: userId,
                members: asanaMembers,
                lastSyncDate: moment().toDate()
            });
        } else {
            console.log("Asana updating");
            const mData = lodash.chain(asanaMembers)
                    .map(x => lodash.extend(x, lodash.find(dbAsanaData.members, { id: x.memberId }) || {}))
                    .value();

            mData.concat(lodash.differenceWith(dbAsanaData.members, asanaMembers, (x1, x2) => x1.memberId === x2.memberId));
            AsanaData.update(dbAsanaData._id, {
                $set: {
                    members: mData,
                    data: trimmedData
                }
            });
        }


        Organization.update(org._id, {
            $set: {
                "integrations.asana.lastFetch": moment().toDate(),
                "integrations.asana.isFetching": false
            }
        });

        Project.update(projectId, {
            $set: {
                "integrations.asana.lastFetch": moment().toDate(),
                "integrations.asana.isFetching": false
            }
        });
    },

    "asana:data:processed"() {
        if (!this.userId) {
            throw new Meteor.Error("You need to be logged in to use this method.");
        }

        const user = Meteor.user();

        const project = Project.findOne({
            _id: user.profile.current_project
        });

        const intData = AsanaData.findOne({
            projectId: user.profile.current_project
        });

        const data = {
            processedClosedTasksData: [],
            processedOpenTasksData: [],
            memberProcessedData: []
        };

        if (project && intData) {
            data.processedClosedTasksData = AH.processTasksData(intData, true);
            data.processedOpenTasksData = AH.processTasksData(intData, false);
            // data.memberProcessedData = AH.memberProcessData(intData, project);
            data.lastDate = lodash.chain(intData.data)
                .map((v, k) => k)
                .sortBy((x) => moment(x))
                .last()
                .value();
            data.lastDataPoint = intData.data[data.lastDate];

            if (intData.members) {
                data.memberSummaryData = intData.memberSummary();
            }
        }

        return data;
    }
});
