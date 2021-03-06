import React from "react";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/row";
import Col from "react-bootstrap/col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Image from "react-bootstrap/Image";
import ListGroup from "react-bootstrap/ListGroup";
import HelpImg from "../../assets/question-mark.png";
import "../../css/Lobby.css";

// Display a detailed view about a specific lobby on the server
class MultiplayerLobby extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			lobbies: null,
			lobbyPlayers: [],
			lobbyId: null,
			isLobbyOwner: false,
			playerId: null,
			lobbyOwnerId: null,
			maxLobbySize: null,
			lobbyReady: false,
		};

		this.determineLobbyInfo = this.determineLobbyInfo.bind(this);
		this.renderHelpPopover = this.renderHelpPopover.bind(this);
	}

	// Calculate lobby information for this lobby
	determineLobbyInfo() {
		// console.log(this.state.lobbiess);
		if (this.state.lobbies) {
			for (let i = 0; i < this.state.lobbies.length; i++) {
				if (this.state.lobbies[i].id === this.state.lobbyId) {
					let thisLobby = this.state.lobbies[i];

					// Check if lobby is ready
					let isLobbyReady = true;
					if (thisLobby.lobbyPlayers.length <= 1) {
						isLobbyReady = false;
					} else {
						for (
							let j = 0;
							j < thisLobby.lobbyPlayers.length;
							j++
						) {
							if (
								thisLobby.lobbyPlayers[j].status !== "In Lobby"
							) {
								isLobbyReady = false;
								break;
							}
						}
					}

					// console.log("Updating lobby players");
					this.setState({
						lobbyPlayers: thisLobby.lobbyPlayers,
						lobbyOwnerId: thisLobby.lobbyOwner,
						maxLobbySize: thisLobby.maxLobbySize,
						lobbyReady: isLobbyReady,
					});
					break;
				}
			}
		}
	}

	// Displays when user hovers over help button
	renderHelpPopover() {
		return(
			<Popover id="popover-basic">
                <Popover.Title as="h3" style={{ textAlign: "center" }}>Multiplayer Lobby Help</Popover.Title>
                <Popover.Content>
					<ListGroup variant="flush">
						<ListGroup.Item>The game starts once the lobby owner starts the game!</ListGroup.Item>
						<ListGroup.Item>All players must be "In Lobby" in order to start a game</ListGroup.Item>
						<ListGroup.Item>This lobby will be closed when the lobby iwner leaves</ListGroup.Item>
						<ListGroup.Item>Only lobby owners may start a game</ListGroup.Item>
						<ListGroup.Item>Once in the game, press ESC to open the game menu</ListGroup.Item>
					</ListGroup>
                </Popover.Content>
			</Popover>
		);
	};

	componentDidMount() {
		// console.log(this.props);
		this.setState(
			{
				lobbies: this.props.lobbies,
				lobbyId: this.props.lobbyId,
				playerId: this.props.playerId,
			},
			() => {
				this.determineLobbyInfo();
			}
		);
	}

	// Update this child component's state depending on parent state changes
	componentDidUpdate(prevProps) {
		if (prevProps.lobbies !== this.props.lobbies) {
			// console.log("Updated lobbies");
			// Note: setState is async, so we assign it a callback determineLobbyInfo()
			// It doesn't work if it is not placed in a function
			this.setState({ lobbies: this.props.lobbies }, () => {
				// console.log(this.state.lobbies);
				this.determineLobbyInfo();
			});
		}
		if (prevProps.lobbyId !== this.props.lobbyId) {
			// console.log("Updated lobbyId");
			// console.log(this.props.lobbyId);
			this.setState({ lobbyId: this.props.lobbyId });
		}
		if (prevProps.isLobbyOwner !== this.props.isLobbyOwner) {
			// console.log("Updated isLobbyOwner");
			// console.log(this.props.isLobbyOwner);
			this.setState({ isLobbyOwner: this.props.isLobbyOwner });
		}
		if (prevProps.playerId !== this.props.playerId) {
			// console.log("Updated lobbies");
			// console.log(this.props.playerId);
			this.setState({ playerId: this.props.playerId });
		}
	}

	render() {
		return (
			<div className="lobby-page">
				{/* Display the Lobby Number and Lobby Size */}
				<Row className="align-items-center">
                    <Col>
						<h1>Lobby {this.state.lobbyId}</h1>
						<h4>
							Size: {this.state.lobbyPlayers.length} /{" "}
							{this.state.maxLobbySize}{" "}
						</h4>
                    </Col>
                </Row>
				<hr />

				{/* Display all players in lobby */}
				<Container fluid={true}>
					<Row>
						<Table bordered size="sm">
							<thead>
								<tr>
									<th> Players </th>
									<th> Lobby Owner </th>
									<th> Status </th>
								</tr>
							</thead>
							<tbody>
								{this.state.lobbyPlayers.map((lobbyPlayer, index) => {
									return (
										<tr
											key={index}
											style={
												this.state.playerId === lobbyPlayer.pid
													? { color: "blue" }
													: {}
											}
										>
											<td>{lobbyPlayer.pid}</td>
											<td>
												{this.state.lobbyOwnerId ===
												lobbyPlayer.pid ? (
													<p> Yes </p>
												) : (
													<p> No</p>
												)}
											</td>
											<td>{lobbyPlayer.status}</td>
										</tr>
									);
								})}
							</tbody>
						</Table>
					</Row>

					{/* Render a different lobby view for a lobby owner and lobby player */}
					{this.state.lobbyOwnerId === this.state.playerId ? (
						// Lobby view for the lobby owner
						<Container>
							<Row className="multiplayer-lobby-text">
								You are lobby owner! The battle starts for everyone once you start the game
							</Row>
							<Row>
								<Col>
									<Button
										variant="primary"
										className="multiplayer-lobby-button"
										disabled={this.state.lobbyReady === false}
										onClick={() => {
											this.props.handleStartGameMultiplayer(
												this.state.playerId,
												this.state.lobbyId
											);
										}}
									>
										Start Game
									</Button>
								</Col>
							</Row>
							<Row>
								<Col>
									<Button
										variant="dark"
										className="multiplayer-lobby-button"
										onClick={() => {
											this.props.handleDeleteLobbyMultiplayer(
												this.state.playerId,
												this.state.lobbyId
											);
										}}
									>
										Delete Lobby
									</Button>
								</Col>
							</Row>
							{/* <Row>
								<Col>
									<Button
										variant="warning"
										className="multiplayer-lobby-button"
										onClick={() => {
											this.props.handleStartGameMultiplayer(
												this.state.playerId,
												this.state.lobbyId
											);
										}}
									>
										Debug Mode - BUGGY!
									</Button>
								</Col>
							</Row> */}
						</Container>
					) : (
						// Lobby view for all other lobby members
						<Container>
							<Row className="multiplayer-lobby-text">
								Prepare yourself! The battle starts as soon as the lobby owner starts the game
							</Row>
							<Col>
								<Button
									variant="dark"
									className="multiplayer-lobby-button"
									onClick={() => {
										this.props.handleLeaveLobbyMultiplayer(
											this.state.playerId,
											this.state.lobbyId
										);
									}}
								>
									Leave Lobby
								</Button>
							</Col>
						</Container>
					)}
				</Container>

				<Row className="lobby-list-footer align-items-center">
                    <Col xs={{ span: 3, offset: 10 }}>
                        <OverlayTrigger trigger="click" placement="top" overlay={this.renderHelpPopover()}>
                            <span id="lobby-help-icon">
                                <Image src={HelpImg} alt={"Help-Button-Image"} style={{maxHeight: "25px", maxWidth: "25px"}} />
                            </span>
                        </OverlayTrigger>
                    </Col>
                </Row>
			</div>
		);
	}
}

export default MultiplayerLobby;
