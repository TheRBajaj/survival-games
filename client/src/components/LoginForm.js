import React from 'react';
import axios from 'axios';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import '../css/LoginForm.css';

class LoginForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            username: "",
            password: "",
            error: "",
            alert: false
        }
        this.handleLogInUser = this.handleLogInUser.bind(this);
        this.handleUsername = this.handleUsername.bind(this);
        this.handlePassword = this.handlePassword.bind(this);
        this.handleAlertClick = this.handleAlertClick.bind(this);
    }

    componentDidMount() {
        //fetch to verify
        //if verified
        if (document.cookie !== "") {
            //getting jwtToken
            const cookie = document.cookie;
            const splitCookie = cookie.split("=");
            const token = splitCookie[1];
            let postData = {
                cookies: token,
            };

            const that = this;
            //fetch call for logging in user
            axios.post('http://localhost:10421/ftd/api/verify', postData)
                .then(response => {
                    //checking if logged in user is verified
                    if (response.data.verified == "Verified") {
                        that.props.handleLoggedIn();
                    }
                })
                .catch(error => {
                    if (error.response) {
                        //error is user is not verified
                        if (error.response.status === 401) {
                            that.setState({
                                error: "Not authorized",
                                alert: true
                            });
                        }
                    }
                })
        }
    }

    //handler for username field
    handleUsername(event) {
        this.setState({ username: event.target.value });
    }

    //handler for password field
    handlePassword(event) {
        this.setState({ password: event.target.value });
    }

    handleAlertClick() {
        this.setState({ alert: false });
    }

    //handler for login Action
    handleLogInUser() {
        //data for fetch call
        let postData = {
            username: this.state.username,
            password: this.state.password,
        };

        const that = this;
        axios.post('http://localhost:10421/ftd/api/login', postData)
            .then(response => {
                //set jwt token for logged in user
                document.cookie = "jwt=" + response.data.jwt;
                that.props.getUser();
                that.props.handleLoggedIn();
            })
            .catch(error => {
                //error status
                if (error.response) {
                    if (error.response.status === 400) {
                        that.setState({
                            error: "Your password and username must be between 6 to 50 (inclusive) characters long",
                            alert: true
                        });
                    } else if (error.response.status === 401) {
                        that.setState({
                            error: "Either that username does not exist, or your password is incorrect (we won't specify which one for security!)",
                            alert: true
                        });
                    } else if (error.response.state === 500) {
                        that.setState({
                            error: "Oops! Internal server error",
                            alert: true
                        });
                    }
                }
            })
    }

    render() {
        let alert;
        if (this.state.alert) {
            alert = <Alert variant="danger" onClose={this.handleAlertClick} dismissible>{this.state.error}</Alert>;
        } else {
            alert = null;
        }

        return (
            <div className="login-form">
                {alert}
                <p>🏹 Minecraft Survival Games 🔫</p>
                <h1 id="login-text">Login</h1>
                <hr />
                <input type="text" className="form-control" placeholder="Username" value={this.state.username} onChange={this.handleUsername} />
                <input type="password" className="form-control" placeholder="Password" value={this.state.password} onChange={this.handlePassword} />

                <Button variant="primary" type="submit" onClick={this.handleLogInUser} className="login-button">Login</Button>
                <Button variant="primary" type="submit" onClick={this.props.handleRegister} className="login-button">Register</Button>
                <Button variant="primary" type="submit" onClick={this.props.handleLeaderBoard} className="login-button">LeaderBoards</Button>
            </div>
        );
    }

}

export default LoginForm;