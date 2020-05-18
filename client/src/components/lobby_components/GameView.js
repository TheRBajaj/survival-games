import React from "react";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import "../../css/GameView.css";

// Display a detailed view about a specific lobby on the server
class GameView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			playerId: null,
			joinedLobbyId: null,
			userWon: false,
			userLost: false,
		};
	}

	componentDidMount() {
		this.setState({
			playerId: this.props.playerId,
			joinedLobbyId: this.props.joinedLobbyId,
			userWon: this.props.userWon,
			userLost: this.props.userLost,
		});
	}

	// Update lobbies passed down from parent LobbiesPage
	componentDidUpdate(prevProps) {
		if (prevProps.playerId !== this.props.playerId) {
			this.setState({ playerId: this.props.playerId });
		}
		if (prevProps.joinedLobbyId !== this.props.joinedLobbyId) {
			this.setState({ joinedLobbyId: this.props.joinedLobbyId });
		}
		if (prevProps.userWon !== this.props.userWon) {
			this.setState({ userWon: this.props.userWon });
		}
		if (prevProps.userLost !== this.props.userLost) {
			this.setState({ userLost: this.props.userLost });
		}
	}

	render() {
		return (
			<div className="clientGameUI">
				<Container>
					<Row>
						<br />
						<canvas
							ref={this.props.canvasRef}
							id="stage"
							width="1200"
							height="800"
							className="clientCanvas"
						></canvas>
					</Row>
					<Row>
						<Button
							variant="warning"
							onClick={() => {
								this.props.handleLeaveGame(
									this.state.playerId,
									this.state.joinedLobbyId
								);
							}}
							className="leaveGameButton"
							block
						>
							Leave game
						</Button>
					</Row>
					{this.state.userWon && (
						<Row>
							<h1> You won! </h1>
						</Row>
					)}
					{this.state.userLost && (
						<Row>
							<h1> You lost! </h1>
						</Row>
					)}
				</Container>
			</div>
		);
	}
}

export default GameView;
