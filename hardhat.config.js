// require('@nomicfoundation/hardhat-toolbox');
require('@nomiclabs/hardhat-waffle');

/** @type import('hardhat/config').HardhatUserConfig */

//const ALCHEMY_API_KEY = ''
//const GOERLI_PRIVATE_KEY = ''

require('dotenv').config({path:__dirname+'/.env'})
module.exports = {
	defaultNetwork: 'hardhat',
	networks: {
		localhost: {
			url: "http://127.0.0.1:8545",
			chainId: 31337,
		},
		hardhat: {
			chainId: 31337,
		},
		goerli: {
      			url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      			accounts: [process.env.GOERLI_PRIVATE_KEY]
    		}	
	},
	solidity: {
		version: '0.8.9',
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
};
