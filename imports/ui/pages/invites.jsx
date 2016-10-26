// Meteor
import { Meteor } from 'meteor/meteor';

// Atmosphere
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

// NPM
import lodash from 'lodash';
import moment from 'moment';

class InvitesRowComponent extends React.Component {
    constructor(props) {
        super(props);
        this.displayName = 'InvitesRowComponent';
        this.state = {
            isAdminInput: false,
            isClientInput: true
        }
    }

    sendInvite(email, ev) {
        const isAdmin = this.state.isAdminInput;
        const isClient = this.state.isClientInput;

        Meteor.call("invites:create:list", [email], { isAdmin, isClient }, (err, resp) => {
            if (err) {
                console.log(err);
                sAlert.error('There was an error sending some of the invites.',
                    { timeout: '5000', position: "bottom", onRouteClose: true });
            } else {
                this.props.getUsers();
                sAlert.success('The invites have been sent successfully.',
                    { timeout: '2000', position: "bottom", onRouteClose: true });
            }
        });
    }

    toggleInvited(ev) {
        if (ev.target.id === `${this.props.inviteUser.email}-admin`) {
            this.setState({
                isAdminInput: !this.state.isAdminInput,
                isClientInput: this.state.isAdminInput || false // if isAdminInput then set to true as adminInput will be set to false
            });
        } else {
            this.setState({
                isClientInput: !this.state.isClientInput,
                isAdminInput: this.state.isClientInput || false
            });
        }
    }

    render() {
        const x = this.props.inviteUser;
        return (
            <tr>
                <td>
                    { x.email }
                </td>

                <td>
                    { x.integrations.join(", ") }
                </td>

                <td>
                    <input
                        id={`${x.email}-admin`}
                        ref="isAdminInput"
                        type="checkbox"
                        onChange={ this.toggleInvited.bind(this) }
                        checked={ this.state.isAdminInput }
                    />
                    <label htmlFor={`${x.email}-admin`}></label>
                </td>

                <td>
                    <input
                        id={`${x.email}-client`}
                        ref="isClientInput"
                        type="checkbox"
                        onChange={ this.toggleInvited.bind(this) }
                        checked={ this.state.isClientInput }
                    />
                    <label htmlFor={`${x.email}-client`}></label>
                </td>

                <td>
                    <button
                        className="btn-flat cyan"
                        onClick={this.sendInvite.bind(this, x.email)}
                        style={{textTransform: "none", color: "white"}}>
                        Send
                    </button>
                </td>
            </tr>
        );
    }
}

const InviteUsersComponent = React.createClass({
    displayName: 'InviteUsersComponent',

    getDefaultProps() {
        return {

        };
    },

    getInitialState() {
        return {
            externalMembers: [],
            error: [],
            isClientInput: true,
            isAdminInput: false
        };
    },

    componentDidMount() {
        this.getUsers();
    },

    /**
    * @summary - Get integration users to invite
    */
    getUsers() {
        Meteor.call("invites:get:memberContact", (err, resp) => {
            if (err) {

            } else {
                this.setState({
                    externalMembers: resp
                })
            }
        });
    },

    submitForm(ev) {
        ev.preventDefault();
        const emailValues = ev.target.inviteUsersInput.value;
        const isAdmin = this.state.isAdminInput;
        const isClient = this.state.isClientInput;

        if (emailValues) {
            const processedEmails = lodash.chain(emailValues.split(","))
                .map(x => lodash.escape(lodash.trim(x)))
                .uniq()
                .value();

            const emailSchema = new SimpleSchema({
                email: {
                    type: String,
                    regEx: SimpleSchema.RegEx.Email
                }
            });
            const stateError = [];
            lodash.each(processedEmails, email => {
                if (!Match.test({ email }, emailSchema)) {
                    stateError.push(`${email} is not a valid email.`);
                    this.setState({
                        error: stateError
                    });
                }
            });

            if (stateError.length === 0) {
                Meteor.call("invites:create:list", processedEmails, { isAdmin, isClient }, (err, resp) => {
                    if (err) {
                        console.log(err);
                        sAlert.error('There was an error sending some of the invites.',
                            { timeout: '5000', position: "bottom", onRouteClose: true });
                    } else {
                        this.refs.inviteUsersInput.value = "";
                        this.setState({
                            isClientInput: true,
                            isAdminInput: false
                        });
                        sAlert.success('The invites have been sent successfully.',
                            { timeout: '2000', position: "bottom", onRouteClose: true });

                        this.setState({
                            error: []
                        });

                        this.getUsers();
                    }
                });
            };

        } else {
            const stateError = [];
            stateError.push("Text area field cannot be empty.")
            this.setState({
                error: stateError
            });
        }
    },

    toggleInvited(ev) {
        if (ev.target.id === "isAdminInput") {
            this.setState({
                isAdminInput: !this.state.isAdminInput,
                isClientInput: false
            });
        } else {
            this.setState({
                isClientInput: !this.state.isClientInput,
                isAdminInput: false
            });
        }
    },

    /**
    * @summary - Renders the member data
    */
    renderMembers() {
        if (this.state.externalMembers.length !== 0) {
            return (
                <div className="col s12">
                    <h5>Integration Invites</h5>

                    <table className="bordered">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Integrations</th>
                                <th>Admin</th>
                                <th>Client</th>
                                <th>Send</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                lodash.map(this.state.externalMembers, (x, i) => {
                                    return (
                                        <InvitesRowComponent
                                            inviteUser={x}
                                            key={i}
                                            getUsers={this.getUsers}
                                        />
                                    )
                                })
                            }
                        </tbody>
                    </table>
                </div>
            );
        }
    },

    render() {
        return (
            <div className="row">
                <div className="col s12 card-panel">
                    <div className="col s12">
                        <h5>Send Invites</h5>

                        <form id="create-team-form" className="col s12" onSubmit={this.submitForm}>
                            <div className="row">
                                <div className="input-field col s5">
                                    {
                                        this.state.error.map((e, i) => {
                                            return (
                                                <div className="chip red darken-1 white-text" key={i}>{e}</div>
                                            )
                                        })
                                    }
                                    <input
                                        id="inviteUsersInput"
                                        ref="inviteUsersInput"
                                        placeholder="Enter emails as member@example.com, ..."
                                    />
                                </div>

                                <div className="input-field col s2">
                                    <input
                                        id="isClientInput"
                                        ref="isClientInput"
                                        type="checkbox"
                                        onChange={ this.toggleInvited }
                                        checked={ this.state.isClientInput }
                                    />
                                    <label htmlFor="isClientInput">Client</label>
                                </div>

                                <div className="input-field col s2">
                                    <input
                                        id="isAdminInput"
                                        ref="isAdminInput"
                                        type="checkbox"
                                        onChange={ this.toggleInvited }
                                        checked={ this.state.isAdminInput }
                                    />
                                    <label htmlFor="isAdminInput">Admin</label>
                                </div>

                                <div className="input-field col s3">
                                    <button
                                        className="btn-flat cyan right"
                                        type="submit"
                                        name="action"
                                        style={{textTransform: "none", color: "white", marginBottom: "10px"}}>
                                        Submit
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {this.renderMembers()}
                </div>
            </div>
        );
    }
});

export const InvitesPage = React.createClass({
    displayName: 'InvitesPage',

    propTypes: {
        organization: React.PropTypes.object.isRequired,
        currentProject: React.PropTypes.object.isRequired,
        invites: React.PropTypes.array,
        isLoading: React.PropTypes.bool.isRequired
    },

    getDefaultProps() {
        return {
            invites: []
        };
    },

    getInitialState() {
        return {
            showInviteComponent: false
        };
    },

    listIntegrationInvites() {

    },

    showInviteUsers() {
        this.setState({
            showInviteComponent: !this.state.showInviteComponent
        })
    },

    resendInvitation(_id, ev) {
        Meteor.call("invites:resend", _id, (err, resp) => {
            if (err) {
                console.log(err);
                sAlert.error('There was an error sending the invite.',
                    { timeout: '5000', position: "bottom", onRouteClose: true });
            } else {
                sAlert.success('The invite has been resent successfully.',
                    { timeout: '2000', position: "bottom", onRouteClose: true });
            }
        })
    },

    removeInvitation(_id, ev) {
        Meteor.call("invites:delete", _id, (err, resp) => {
            if (err) {
                console.log(err);
                sAlert.error('There was an error removing the invite.',
                    { timeout: '5000', position: "bottom", onRouteClose: true });
            } else {
                sAlert.success('The invites have been removed successfully.',
                    { timeout: '2000', position: "bottom", onRouteClose: true });
            }
        });
    },

    // ADD ABILITY TO CHANGE ROLE ONCE INVITE HAS BEEN SENT
    renderSentInvites() {
        if (this.props.invites.length !== 0) {
            return (
                <div className="col s12 card-panel">
                    <h5>Sent Invites</h5>
                    <table className="bordered">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Status</th>
                                 <th>Role</th>
                                <th>Resend</th>
                                <th>Remove</th>
                                <th>Sent On</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                this.props.invites.map((x, i) => {
                                    return (
                                        <tr key={i}>
                                            <td>
                                                { x.email }
                                            </td>
                                            <td>
                                                { x.status }
                                            </td>

                                            <td>
                                                { x.isAdmin ? "Admin" : (x.isClient ? "Client": "Not Specified") }
                                            </td>

                                            <td>
                                                {
                                                    x.status === "PENDING" ?
                                                    <a href=""  onClick={this.resendInvitation.bind(this, x._id)}>
                                                        Resend
                                                    </a>
                                                    : ""
                                                }
                                            </td>
                                            <td>
                                                {
                                                    x.status === "PENDING" ?
                                                    <a href="" onClick={this.removeInvitation.bind(this, x._id)}>
                                                        Remove
                                                    </a>
                                                    : ""
                                                }
                                            </td>
                                            <td>
                                                { moment(x.createdAt).format('MMMM D YYYY, h:mm a') }
                                            </td>
                                        </tr>
                                    )
                                })
                            }
                        </tbody>
                    </table>
                </div>
            );
        } else {
            return (
                <div className="col s12 card-panel">
                    <h5>No Pending Invites</h5>
                </div>
            );
        }
    },

    render() {
        if (this.props.isLoading) {
            return (
                <ReactLoadingView />
            );
        };

        return (
            <div>
                <div className="row">
                    <div className="col s12 card-panel">
                        <div className="col s8">
                            <h4>Invites</h4>
                        </div>

                        <div className="col s4">
                            <button
                                className="btn blue right"
                                onClick={this.showInviteUsers}
                                style={{marginTop: "15px"}}
                                data-position="left"
                                data-delay="50"
                                data-tooltip="Click to sync the data.">

                                {
                                    this.state.showInviteComponent ?
                                    "Close":
                                    "Create Invite"
                                }
                            </button>
                        </div>
                    </div>

                    {
                        this.state.showInviteComponent ?
                        <InviteUsersComponent /> :
                        ""
                    }

                    {this.renderSentInvites()}
                </div>
            </div>
        );
    }
});
