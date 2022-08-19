// require('@nomicfoundation/hardhat-toolbox');
require('@nomiclabs/hardhat-waffle');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	defaultNetwork: 'hardhat',
	networks: {
		hardhat: {
			chainId: 1337,
		},
		mumbai: {
			url: 'https://rpc-mumbai.maticvigil.com',
			account: [process.env.PRIVATE_KEY],
		},
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
