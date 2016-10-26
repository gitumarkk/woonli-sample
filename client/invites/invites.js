Template.invites.helpers({
    user_invites: function() {
        var self = this,
            emails = _.map(user.emails, function(obj) { return obj.address; });
        return Invites.find({email: {$in : emails}});
    },

    orgName: function(orgId) {
        var self = this;
        return Organization.findOne({_id: orgId}).name;
    },

    teamName: function(teamId) {
        var self = this,
            team = Team.findOne({_id: teamId});

        if (team) {
            return team.name;
        }
    }
});


Template.inviteModal.created = function() {
    var self = this;
    self.asanaApi = new ReactiveDict();
};

Template.inviteModal.rendered = function() {
    $(document).ready(function(){
        $('ul.tabs').tabs();
    });
};

Template.inviteModal.helpers({
    asana_users: function() {
        var self = this;
        return Template.instance().asanaApi.get("users");
    },
    has_asana: function() {
        var self = this;

        if (self.organization && self.organization.integrations) {
            return self.organization.integrations.asana;
        }
    }
});

Template.inviteModal.events({
    'click #invite-with-asana': function(ev, template) {
        ev.preventDefault();
        var self = this;

        if (!template.asanaApi.get("users")) {
            Meteor.call("asana:get:users", function(error, response) {
                var users = _.filter(response.data, function(data) { return data.email !== null; });
                $("#asana-users .progress").hide();
                template.asanaApi.set("users", users);
            });
        }
    },

    'click .invite-via-asana': function(ev, template) {
        ev.preventDefault();

        var self = this, teamId, orgId,
            $el = $(ev.currentTarget),
            email = $el.data("email"),
            emails_error = [];

        if (template.data.team) {
            orgId = template.data.team.organizationId;
            teamId = template.data.team._id;

        } else {
            orgId = template.data.organization._id;
        }

        if (validator.isEmail(email)) {
            Meteor.call("invites:add", email, orgId, teamId, function(error, response) {
                if (error) {
                    sAlert.error(email + ' could not be invited because ' + error.reason,
                        {position: "bottom"});
                } else {
                    sAlert.success('Email has been sent.',
                        {position: "bottom"});
                }
            });

        } else {
            sAlert.error(email + ' could not be invited because it is not an email',
                        {position: "bottom"});
        }
    },

    "submit #invite-via-email": function(ev, template) {
        ev.preventDefault();

        var self = this, orgId, teamId,
            $el = $(ev.currentTarget),
            $textarea = $el.find("textarea"),
            emails = $textarea.val(),
            emails_error = [];

        if (template.data.team) {
            orgId = template.data.team.organizationId;
            teamId = template.data.team._id;

        } else {
            orgId = template.data.organization._id;
        }

        if (emails) {
            // Split string, then trim for white space, escapes html and filter duplicates
            emails = _.uniq(_.map(emails.split(","),
                function(email) {return _.escape($.trim(email));}));
        } else {
            sAlert.error('Please enter emails',
                {position: "bottom"});
        }

        $textarea.val("");

        _.each(emails, function(email) {
            if (validator.isEmail(email)) {
                Meteor.call("invites:add", email, orgId, teamId, function(error, response) {
                    if (error) {
                        sAlert.error(email + ' could not be invited because ' + error.reason,
                            {position: "bottom"});
                        emails_error.push(email);
                        $textarea.val(emails_error.join(","));
                    }
                });
            } else {
                sAlert.error(email + ' could not be invited because it is not an email',
                            {position: "bottom"});
                emails_error.push(email);
                $textarea.val(emails_error.join(","));
            }
        });
    }

});
