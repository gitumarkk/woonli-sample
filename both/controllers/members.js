// App Imports
import { MemberContainer } from '../../imports/ui/containers/members.js';

OrganizationMembersController = AppController.extend({
    template: "reactRender",
    data: function() {
        return {
            currentUserEmail: this.params._userEmail
        };
    }
});


OrganizationMembersController.helpers({
    currentReactView: function() {
        return MemberContainer;
    }
});
