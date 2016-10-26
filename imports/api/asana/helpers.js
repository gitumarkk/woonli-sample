import lodash from 'lodash';
import d3 from 'd3';
import moment from 'moment';


export const AsanaHelper = {
    processTasksData(integrationData, completed=false) {
        const data = lodash.cloneDeep(integrationData.data);
        const colors = d3.scale.category10();
        const output = {};
        const lists = [];
        const parseDate = d3.time.format("%Y-%B-%d").parse;

        lodash.each(data, (val, dt) => {
            lodash.each(val, (x) => {
                const o = {};
                o.color = colors(x.id);
                o.x = parseDate(moment(x.date || dt).format("YYYY-MMMM-DD"));
                o.y = completed ? (x.completedTotal || 0) : (x.createdTotal || 0);
                o.key = completed ? "completedTotal" : "createdTotal";

                if (completed) {
                    // o.verboseSummary = lodash.map(x.deadline, (v, k) => {
                    //     return `${k} = ${v}`;
                    // });
                    o.summary = lodash.transform(x.deadline, (out, v, k) => {
                        out[k] = v;
                    }, {});
                } else {
                    // o.verboseSummary = [
                    //     `Assigned = ${x.assigned}`,
                    //     `Unassigned = ${x.unassigned}`
                    // ];
                    o.summary = {
                        Assigned: x.assigned,
                        Unassigned: x.unassigned
                    }
                }

                if (lodash.findIndex(lists, { id: x.id, name: x.name }) === -1) {
                    lists.push({ id: x.id, name: x.name, color: o.color });
                }

                if (output[x.id]) {
                    // Only add to list if not already added
                    if (lodash.findIndex(output[x.id], o) === -1) {
                        output[x.id].push(o);
                    }
                } else {
                    output[x.id] = [o];
                }
            });
        });

        // return lodash.chain(output).map((v, k) => {
        //     // if (completed && !lodash.find(lists, {id: Number(k)})) {
        //     //     console.log(k, lodash.find(lists, {id: Number(k)}), lists);
        //     // };
        //     return {
        //         meta: {
        //             listId: k,
        //             title: lodash.find(lists, { id: Number(k) }).name,
        //             color: colors(Number(k))
        //         },
        //         data: v
        //     };
        // }).value();

        return lodash.chain(output)
            .transform((out, v, k) => {
                const title = lodash.find(lists, { id: Number(k) }).name;
                out[title] = {
                    meta: {
                        listId: k,
                        title: title,
                        color: colors(Number(k))
                    },
                    data: v
                };
            }, {}).value();
    },

    memberProcessData(integrationData, currentProject) {
        const data = lodash.cloneDeep(integrationData.data);
        const colors = d3.scale.category10();
        const output = {};
        const lists = [];
        const parseDate = d3.time.format("%Y-%B-%d").parse;
        const memberData = (currentProject.integrations &&
                currentProject.integrations.asana &&
                currentProject.integrations.asana.users);
        const memberMap = lodash.chain(memberData)
                .map((x) => { return { [x.id]: x.email }; })
                .reduce((o, m) => lodash.merge(o, m), {})
                .value();

        lodash.each(data, (val, dt) => {
            lodash.each(val, (x) => {
                const members = lodash.filter(x.members, (y) => y.memberId !== "UNASSIGNED");
                const o = {};
                o.color = colors(x.id);
                o.x = parseDate(moment(x.date || dt).format("YYYY-MMMM-DD"));
                o.y = members.length || 0;

                o.summary = lodash.transform(members, (out, y) => {
                    out[memberMap[y.memberId]] = y.tasksPendingTotal;
                }, {});

                if (lodash.findIndex(lists, { id: x.id, name: x.name }) === -1) {
                    lists.push({ id: x.id, name: x.name, color: o.color });
                }

                if (output[x.id]) {
                    // Only add to list if not already added
                    if (lodash.findIndex(output[x.id], o) === -1) {
                        output[x.id].push(o);
                    }
                } else {
                    output[x.id] = [o];
                }
            });
        });

        return lodash.chain(output)
            .transform((out, v, k) => {
                const title = lodash.find(lists, { id: Number(k) }).name;
                out[title] = {
                    meta: {
                        listId: Number(k),
                        title: title,
                        color: colors(k)
                    },
                    data: v
                };
            }, {})
            .value();
    }
}
