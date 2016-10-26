// App Imports
import { DataProcessHelper } from '../../helpers/dataprocess.js';
import { DataChartComp } from '../components/charts/charts.jsx';

// NPM
import lodash from 'lodash';

const MemberDetail = React.createClass({
    displayName: 'MemberDetail',

    propTypes: {
        userData: React.PropTypes.array.isRequired,
        currentUserEmail: React.PropTypes.string.isRequired
    },

    parseUserData() {
        const output = {
                emails: [],  // A list containing user emails
                names: [],  // A list containing user names according to integrations,
                photos: [],  // A list containing user images,
                phones: [],
                tz: [],
                integrations: [],
                accounts: []
            };

        lodash.each(this.props.userData, function(data) {
            output.integrations.push(data.integration);

            if (data.integration === "slack") {
                output.emails.push(data.data.profile.email);
                output.names.push(data.data.profile.real_name);
                output.photos.push(data.data.profile.image_72);
                output.tz.push(data.data.tz);

                output.accounts.push({email: data.data.profile.email, integration: data.integration});

                if (data.data.profile.phone) {
                    output.phones.push(data.data.profile.phone)
                };
            }

            if (data.integration === "asana") {
                output.emails.push(data.data.email);
                output.names.push(data.data.name);
                output.accounts.push({email: data.data.email, integration: data.integration});

                if (data.data.photo) {
                    output.photos.push(data.data.photo.image_60x60);
                }
            }

            if (data.integration == "trello") {
                output.emails.push(data.data.username);
                output.names.push(data.data.fullName);
                output.accounts.push({email: data.data.username, integration: data.integration});
            }

            if (data.integration == "bitbucket") {
                output.emails.push(data.data.email);
                output.accounts.push({email: data.data.email, integration: data.integration});
            }

            if (data.integration == "github") {
                const identifier = data.data.email || data.data.login;

                output.emails.push(identifier);
                output.accounts.push({email: identifier, integration: data.integration});
            }
        });

        output.emails = lodash.uniq(output.emails, function(data) {
            if (!data) return;
            return data.toLowerCase();
        });

        output.names = lodash.uniq(output.names, function(data) {
            if (!data) return;
            return data.toLowerCase().replace(/\s/g, "");
        });

        output.phones = lodash.uniq(output.phones, function(data) {
            if (!data) return;
            return data.toLowerCase();
        });

        return output;

    },

    unMergeAccount(email, ev) {
        ev.preventDefault();
        Meteor.call("project:user:removemerge", this.props.currentUserEmail, email, (error) => {
            if (!error) {
                location.reload();
            }
        });
    },

    renderUnMergeButton(email) {
        if (email !== this.props.currentUserEmail) {
            return (
                <a href="#" onClick={this.unMergeAccount.bind(null, email)}>
                    Unmerge User
                </a>
            )
        }
    },

    renderAccounts(accounts) {
        return accounts.map(function(account, index) {
            return (
                <li className="collection-item" key={account.email + "-" + index}>
                    <div className="row">
                        <div className="col s4">{account.email}</div>
                        <div className="col s4">{account.integration}</div>
                        <div className="col s4">{this.renderUnMergeButton(account.email)}</div>
                    </div>
                </li>
            );
        }, this);
    },

    render() {
        let userData = this.parseUserData();

        return (
            <div>
                <div className="row">
                    <div className="col s12">
                        <div className="card">
                            <div className="card-title grey-text text-darken-4">
                                <div className="col s6">
                                    <h3>Member Details</h3>
                                </div>

                                <div className="col s6">
                                    {userData.photos.map(function(imageUrl) {
                                        return (
                                            <img key={imageUrl} src={imageUrl} />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="card-content">
                                <table className="striped">
                                    <tbody>
                                        <tr>
                                            <td>Names</td>
                                            <td>{userData.names.join(", ")}</td>
                                        </tr>

                                        <tr>
                                            <td>Integrations</td>
                                            <td>{userData.integrations.join(", ")}</td>
                                        </tr>

                                        <tr>
                                            <td>Accounts</td>
                                            <td>
                                                <ul className="collection">
                                                    {this.renderAccounts(userData.accounts)}
                                                </ul>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

export const MemberPage = React.createClass({
    displayName: 'MemberPage',
    mixins: [DataProcessHelper],
    propTypes: {
        user: React.PropTypes.object,
        currentUserEmail: React.PropTypes.string.isRequired  // The user email to query
    },

    getInitialState() {
        return {
            projectSummary: [],
            processedData: {},
            dataSeries: [],
            currentDataSeries: [], // Used to process the data.
            isLoading: true
        };
    },

    componentDidMount() {
        this.getData();
    },

    getData() {
        Meteor.call("project:data:member", this.props.currentUserEmail, (error, response) => {
            if (!error) {
                const series = lodash.map(response, (v, k) => v.meta);

                this.setState({
                    dataSeries: lodash.cloneDeep(series),
                    currentDataSeries: lodash.cloneDeep(series),
                    processedData: response,
                    isLoading: false
                });
            }
        });
    },

    /**
    * @summary - Flters the organization integration data according to the current user properties
    * and the merged user's data.
    */
    getUserData() {
        // Contains the current emails and any children merged emails.
        const accountEmails = this.getAccountsMergedEmails(this.props.currentUserEmail, this.props.currentProject);


        // Map each organization integration.
        const usersData = lodash.map(this.props.currentProject.integrations, function(value, key) {
            // value.user_data was the original way of describing bitbucket data and it should
            // be removed.

            if (value.users) {
                // Filtering users according the list of props.email and related merged emails.
                const userData = value.users;
                const _data = lodash.filter(userData, function(_user) {

                    // Asana && Bitbucket
                    if (_user.email) {
                        return accountEmails.indexOf(_user.email.toLowerCase()) !== -1;
                    }

                    // Slack
                    if (_user.profile && _user.profile.email) {
                        return accountEmails.indexOf(_user.profile.email.toLowerCase()) !== -1;
                    }

                    // Trello
                    if (_user.username) {
                        return accountEmails.indexOf(_user.username.toLowerCase()) !== -1;
                    }

                    // Github, when there is no email present
                    if (_user.login && !_user.email) {
                        return accountEmails.indexOf(_user.login.toLowerCase()) !== -1;
                    }
                });

                if (_data.length !== 0) {
                    return {
                        integration: key,
                        data: _data[0] // Assuming only 1 entry
                    }
                };
            }
        });

        // Return filtered non empty values
        return lodash.filter(usersData, Boolean);
    },

    render() {
        if (this.props.isLoading || this.state.isLoading) {
            return (
                <ReactLoadingView />
            );
        }

        // Getting the selected users data from the integratioon
        const userData = this.getUserData()

        return (
            <div>
                <div className="row">
                    <div className="col s12">
                        <MemberDetail
                            userData={userData}
                            currentUserEmail={this.props.currentUserEmail}
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col s12">
                        <DataChartComp
                            data={this.state.processedData}
                            dataSeries={this.state.currentDataSeries}
                            chartType={"bar"}
                            chartName="data-tasks"
                            chartTitle="Data Task"
                        />
                    </div>
                </div>
            </div>
        );
    }
});

