// Meteor
import { Meteor } from 'meteor/meteor';

// App
import { InvitesPage } from '../pages/invites.jsx';
import { Organization } from '../../api/organization/collections.js';
import { Project } from '../../api/project/collections.js';
import { Invites } from '../../api/invite/collections.js';

// Atmosphere
import { createContainer } from 'meteor/react-meteor-data';

export const InvitesContainer = createContainer(() => {
    const handler = Meteor.subscribe("organization");
    const inviteHandler = Meteor.subscribe("invites:get:invites");
    const user = Meteor.user();
    const data = {
        isLoading: !handler.ready() || !inviteHandler.ready(),
        organization: {},
        currentProject: {}
    };

    if (!data.isLoading && user && user.profile.current_organization) {
        data.organization = Organization.findOne({
            _id: user.profile.current_organization
        });
        data.currentProject = Project.findOne({
            _id: user.profile.current_project
        });
        data.invites = Invites.find({
            organizationId: user.profile.current_organization,
            projectId: user.profile.current_project
        }).fetch();
    }
    return data;
}, InvitesPage);
