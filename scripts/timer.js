const hre = require("hardhat")

const startTime = async () => {

	const provider = new hre.ethers.providers.JsonRpcProvider("http://localhost:8545");
	await provider.send("evm_increaseTime", [1])
	await provider.send("evm_mine")
	console.log("Increased by 1 sec");
}

setInterval(startTime, 1000);
