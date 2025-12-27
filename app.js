let userScore = 0;
let compScore = 0;

const choices = document.querySelectorAll(".choice");
const msg = document.querySelector("#msg");

const userScorePara = document.querySelector("#user-score");
const compScorePara = document.querySelector("#comp-score");

const genCompChoice = () => {
    const options = ["rock", "paper", "scissors"];
    const ranIdx = Math.floor(Math.random() * 3);
    return options[ranIdx];
};

const drawGame = () => {
    msg.innerText = "Game was Draw. Play again.";
    msg.style.backgroundColor = "#475569";
};

// Pass userChoice and compChoice here so we can print them in the message
const showWinner = (userWin, userChoice, compChoice) => {
    if (userWin) {
        userScore++;
        userScorePara.innerText = userScore;

        // Modern Message: showing what beat what
        msg.innerText = `You Win! Your ${userChoice} beats ${compChoice}`;

        // Modern Green Color
        msg.style.backgroundColor = "#10b981";
    } else {
        compScore++;
        compScorePara.innerText = compScore;

        // Modern Message
        msg.innerText = `You Lost. ${compChoice} beats your ${userChoice}`;

        // Modern Red Color
        msg.style.backgroundColor = "#ef4444";
    }
};

const playGame = (userChoice) => {
    // 1. Generate computer Choice
    const compChoice = genCompChoice();

    if (userChoice === compChoice) {
        drawGame();
    } else {
        let userWin = true;
        if (userChoice === "rock") {
            // scissors, paper
            userWin = compChoice === "paper" ? false : true;
        } else if (userChoice === "paper") {
            // rock, scissors
            userWin = compChoice === "scissors" ? false : true;
        } else {
            // rock, paper
            userWin = compChoice === "rock" ? false : true;
        }

        // Pass all three arguments to the function
        showWinner(userWin, userChoice, compChoice);
    }
};

choices.forEach((choice) => {
    choice.addEventListener("click", () => {
        const userChoice = choice.getAttribute("id");
        playGame(userChoice);
    });
});