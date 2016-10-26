// App Imports
import { InvitesContainer } from '/imports/ui/containers/invites.js';

InvitesController = AppController.extend({
    template: "reactRender"
});

InvitesController.helpers({
    currentReactView: function() {
        return InvitesContainer;
    }
});
