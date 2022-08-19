const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { expect } = require('chai');
const { sleep } = require('../utils/sleep');

describe('Warranty System', function () {
	async function deploymentFixture() {
		const Warranty = await ethers.getContractFactory('WarrantySystem');
		const deployWarranty = await Warranty.deploy();
		await deployWarranty.deployed();
		return deployWarranty;
	}

	describe('Deployment', function () {
		it('Should check the listingPrice : 50000000000000000', async function () {
			const contract = await loadFixture(deploymentFixture);
			const listingPrice = await contract.getListingPrice();
			expect(listingPrice.toString()).to.equal('50000000000000000');
		});
	});

	describe('Check sender and owner', function () {
		it('Has same sender and owner.', async function () {
			const contract = await loadFixture(deploymentFixture);

			const owner = await contract.getContractOwner();
			const sender = await contract.getSender();

			console.log('Owner: ', owner.toString());
			console.log('Sender: ', sender.toString());

			expect(owner).to.equal(sender);
		});

		it('Has Different sender and owner', async function () {
			const contract = await loadFixture(deploymentFixture);

			const signers = await ethers.getSigners();

			let diff = true;
			for (let i = 3; i < 6; i++) {
				console.log(`Signer ${i + 1} processing ...`);
				const Warranty = await ethers.getContractFactory(
					'WarrantySystem',
					signers[i]
				);

				const owner = await Warranty.attach(
					contract.address
				).getContractOwner();
				const sender = await Warranty.attach(contract.address).getSender();

				const ownerAddr = owner.toString();
				const senderAddr = sender.toString();

				console.log('Owner: ', ownerAddr);
				console.log('Sender: ', senderAddr);

				if (owner === sender) {
					diff = false;
				}
			}

			expect(diff).to.equal(true);
		});
	});

	describe('Product Creation', function () {
		it('Has same uri: www.example.com/donu.jpg', async () => {
			try {
				const contract = await loadFixture(deploymentFixture);

				const signers = await ethers.getSigners();
				const signer1 = signers[3];

				const Warranty = await ethers.getContractFactory(
					'WarrantySystem',
					signer1
				);
				const listingPrice = ethers.utils.parseUnits('0.05', 'ether');

				const txnReceipt = await Warranty.attach(contract.address).mintToken(
					'www.example.com/donu.jpg',
					3,
					30,
					0,
					{ value: listingPrice }
				);
				const logs = await txnReceipt.wait();

				const tokenId = parseInt(logs.logs[0].topics[3], 16);

				const tokenURI = await Warranty.attach(contract.address).tokenURI(
					tokenId
				);

				console.log(tokenURI);
				expect(tokenURI.toString()).to.equal('www.example.com/donu.jpg');
			} catch (err) {
				console.log('ERROR: ', err.message);
				expect(1).to.equal(0);
			}
		});
		it('Has same URI for multiple tokenIds', async () => {
			try {
				const contract = await loadFixture(deploymentFixture);

				const testURI = [
					'www.example.com/donu1.jpg',
					'www.example.com/donu2.jpg',
					'www.example.com/donu3.jpg',
				];

				let resultURI = [];

				let signers,
					signer,
					Warranty,
					listingPrice,
					txnReceipt,
					logs,
					URI,
					tokenId;

				for (let i = 3; i < 6; i++) {
					signers = await ethers.getSigners();
					signer = signers[i];
					Warranty = await ethers.getContractFactory('WarrantySystem', signer);

					listingPrice = ethers.utils.parseUnits('0.05', 'ether');

					txnReceipt = await Warranty.attach(contract.address).mintToken(
						testURI[i % 3],
						3,
						30,
						0,
						{ value: listingPrice }
					);
					logs = await txnReceipt.wait();

					tokenId = parseInt(logs.logs[0].topics[3], 16);

					URI = await Warranty.attach(contract.address).tokenURI(tokenId);

					resultURI.push(URI);
				}

				expect(
					resultURI.every(
						(currentValue, index, arr) => currentValue == testURI[index]
					)
				).to.equal(true);
			} catch (err) {
				console.log(err);
				expect(1).to.equal(0);
			}
		});
	});

	describe('Buy Product', function () {
		it('Needs to buy product from two different account', async () => {
			try {
				const contract = await loadFixture(deploymentFixture);

				const signers = await ethers.getSigners();

				const seller = signers[3];
				const buyer = signers[4];

				// Creation of Product by Seller
				const WarrantySeller = await ethers.getContractFactory(
					'WarrantySystem',
					seller
				);
				const listingPrice = ethers.utils.parseUnits('0.05', 'ether');

				const txnReceiptSeller = await WarrantySeller.attach(
					contract.address
				).mintToken(
					'www.example.com/donu.jpg',
					ethers.utils.parseUnits('3', 'ether'),
					30,
					0,
					{ value: listingPrice }
				);
				const logsSeller = await txnReceiptSeller.wait();

				const tokenId = parseInt(logsSeller.logs[0].topics[3], 16);

				const initialTokenOwner = await WarrantySeller.attach(
					contract.address
				).ownerOf(tokenId);

				console.log(
					`Initial Token Owner: ${initialTokenOwner} with token ${tokenId}`
				);
				// Buying of Product
				const WarrantyBuyer = await ethers.getContractFactory(
					'WarrantySystem',
					buyer
				);

				const costPrice = ethers.utils.parseUnits('3', 'ether');
				const txnReceiptBuyer = await WarrantyBuyer.attach(
					contract.address
				).buyProduct(tokenId, 0, { value: costPrice });
				const logsBuyer = await txnReceiptBuyer.wait();

				// logsBuyer.events.forEach((element) => {
				// 	if (
				// 		element.event === 'Transfer' &&
				// 		txnReceiptBuyer.hash === element.transactionHash
				// 	) {
				// 		console.log(element.topics);
				// 	}
				// });

				const finalTokenOwner = await WarrantySeller.attach(
					contract.address
				).ownerOf(tokenId);

				console.log(
					`Final Token Owner: ${finalTokenOwner} with token ${tokenId}`
				);

				expect(finalTokenOwner).to.equal(buyer.address);
			} catch (err) {
				console.log(err.name);
				expect(1).to.equal(0);
			}
		});
		it('Checking Double Buy is not Allowed', async () => {
			try {
				const contract = await loadFixture(deploymentFixture);

				const signers = await ethers.getSigners();

				const seller = signers[3];
				const buyer1 = signers[4];
				const buyer2 = signers[5];

				// Creation of Product by Seller
				const WarrantySeller = await ethers.getContractFactory(
					'WarrantySystem',
					seller
				);
				const listingPrice = ethers.utils.parseUnits('0.05', 'ether');

				const txnReceiptSeller = await WarrantySeller.attach(
					contract.address
				).mintToken(
					'www.example.com/donu.jpg',
					ethers.utils.parseUnits('3', 'ether'),
					30,
					0,
					{ value: listingPrice }
				);
				const logsSeller = await txnReceiptSeller.wait();

				const tokenId = parseInt(logsSeller.logs[0].topics[3], 16);

				const initialTokenOwner = await WarrantySeller.attach(
					contract.address
				).ownerOf(tokenId);

				console.log(
					`Initial Token Owner: ${initialTokenOwner} with token ${tokenId}`
				);
				// Buying of Product
				const WarrantyBuyer = await ethers.getContractFactory(
					'WarrantySystem',
					buyer1
				);

				const costPrice = ethers.utils.parseUnits('3', 'ether');
				const txnReceiptBuyer = await WarrantyBuyer.attach(
					contract.address
				).buyProduct(tokenId, 0, { value: costPrice });

				const isSoldReceipt = await WarrantyBuyer.attach(
					contract.address
				).isProductSold(tokenId);

				const isSoldLogs = await isSoldReceipt.wait();

				isSoldLogs.events.forEach((element) => {
					if (element.event === 'BooleanValue') {
						console.log(
							`Product with token ${tokenId} isSold:`,
							parseInt(element.topics[1], 16) === 1 ? true : false
						);
					}
				});

				const WarrantyBuyer2 = await ethers.getContractFactory(
					'WarrantySystem',
					buyer2
				);

				await WarrantyBuyer2.attach(contract.address).buyProduct(tokenId, 0, {
					value: costPrice,
				});

				expect(1).to.equal(0);
			} catch (err) {
				console.log(err.message);
				expect(1).to.equal(1);
			}
		});
		it('Must check Expiry', async () => {
			try {
				const contract = await loadFixture(deploymentFixture);

				const signers = await ethers.getSigners();

				const seller = signers[3];
				const buyer = signers[4];

				// Creation of Product by Seller
				const WarrantySeller = await ethers.getContractFactory(
					'WarrantySystem',
					seller
				);
				const listingPrice = ethers.utils.parseUnits('0.05', 'ether');

				const txnReceiptSeller = await WarrantySeller.attach(
					contract.address
				).mintToken(
					'www.example.com/donu.jpg',
					ethers.utils.parseUnits('3', 'ether'),
					30,
					0,
					{ value: listingPrice }
				);
				const logsSeller = await txnReceiptSeller.wait();

				const tokenId = parseInt(logsSeller.logs[0].topics[3], 16);

				const initialTokenOwner = await WarrantySeller.attach(
					contract.address
				).ownerOf(tokenId);

				console.log(
					`Initial Token Owner: ${initialTokenOwner} with token ${tokenId}`
				);
				// Buying of Product
				const WarrantyBuyer = await ethers.getContractFactory(
					'WarrantySystem',
					buyer
				);

				const costPrice = ethers.utils.parseUnits('3', 'ether');
				const txnReceiptBuyer = await WarrantyBuyer.attach(
					contract.address
				).buyProduct(tokenId, 0, { value: costPrice });

				const ownerOfTokenId = await WarrantyBuyer.attach(
					contract.address
				).ownerOf(tokenId);
				console.log(`Owner of ${tokenId} is ${ownerOfTokenId}`);

				// const checkTokenURI = async () => {
				// 	await WarrantyBuyer.attach(contract.address).isSold(tokenId);
				// };

				// await new Promise(r => setTimeout(checkTokenURI, 40000));

				await sleep(40000);

				await WarrantyBuyer.attach(contract.address).isProductSold(tokenId);

				expect(1).to.equal(0);
			} catch (err) {
				console.log(err.message);
				expect(1).to.equal(1);
			}
		}).timeout(60000);
	});
});
