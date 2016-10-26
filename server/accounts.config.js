// App
import { Invites } from '../imports/api/invite/collections.js';

Accounts.onCreateUser(function(options, user) {
    if (user.profile === undefined) {
        if (options.profile) {
            user.profile = options.profile;
        } else {
            user.profile = {};
            user.profile.email = user.emails[0].address;
        }

        if (user.profile.invite_code) {
            const invite = Invites.findOne({
                _id: user.profile.invite_code,
                status: "PENDING"
            });

            if (invite) {
                user.profile.current_organization = invite.organizationId;
                user.profile.current_project = invite.projectId;

                if (invite.isAdmin) {
                    user.profile.isAdmin = invite.isAdmin;
                    user.profile.adminBelong = [{
                        organizationId: invite.organizationId,
                        projectId: invite.projectId
                    }];

                } else { // Assume the user is a client
                    user.profile.isClient = invite.isClient;
                    user.profile.clientBelong = [{
                        organizationId: invite.organizationId,
                        projectId: invite.projectId
                    }];
                }
                invite.updateStatus("ACCEPTED");

                try {
                    Meteor.call("memberships:create", invite.organizationId, invite.projectId, user._id, (err, resp) => {
                        if (err) console.error(err);
                    });
                } catch(e) {
                    console.error(e);
                }

            }
        };
    }

    try {
        Meteor.call("email:send:admin:signup", user.profile.email);

    } catch (error) {
        console.error(error);
    }

    return user;
});
