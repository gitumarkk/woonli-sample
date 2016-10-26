// Meteor
import { Meteor } from 'meteor/meteor';

// App
import { MemberPage } from '../pages/member.jsx';
import { Organization } from '../../api/organization/collections.js';
import { Project } from '../../api/project/collections.js';

// Atmosphere
import { createContainer } from 'meteor/react-meteor-data';

export const MemberContainer = createContainer(() => {
    const data = {
        organization: {},
        currentProject: {},
        organizationdata: []
    };
    const handler = Meteor.subscribe("organization");
    const user = Meteor.user();

    data.user = user;
    data.isLoading = !handler.ready();

    if (!data.isLoading && user && user.profile.current_organization) {
        data.organization = Organization.findOne({
            _id: user.profile.current_organization
        });
        data.currentProject = Project.findOne({
            _id: user.profile.current_project
        });
    }
    return data;
}, MemberPage);
