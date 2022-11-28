//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "hardhat/console.sol";

contract WarrantySystem is ERC721URIStorage{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    uint256 listingPrice = 0.05 ether;
    address payable owner;

    mapping(uint256 => Product) private idToProduct;
    mapping(uint256 => string[]) private activityURIs;

    string ipfsBaseURI = "";

    struct Product {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool isSold;
        uint256 expiryDuration;
        uint256 expiryTime;
        uint256 secretKey;
    }

    event BooleanValue (
        bool indexed tokenId
    );

    event IntegerValue (
        uint256 indexed integerValue
    );

    event ArrayValue (
        string[] indexed arr
    );

    function getTokenDetails(uint256 token) public view returns(address, address, uint256, bool, uint256, uint256, uint256, uint256) {
	Product memory p =  idToProduct[token];
	return (p.seller, p.owner, p.price, p.isSold, p.expiryDuration, p.expiryTime, p.secretKey, block.timestamp);
    }



    constructor()  ERC721("Warranty Token","WARR"){
        owner = payable(msg.sender);
    }

    function setipfsBaseURI(string memory ipfsURI) public {
        ipfsBaseURI = ipfsURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireMinted(tokenId);
	require( block.timestamp<=idToProduct[tokenId].expiryTime, "Warranty expired!!!");

        string memory _tokenURI = super.tokenURI(tokenId);
        string memory base = ipfsBaseURI;

        if (bytes(base).length == 0) {
            return _tokenURI;
        } else {
            return string(abi.encodePacked(base, _tokenURI));
        }
    }

    function getTokenURI(uint256 tokenId) public view returns (string memory, bool) {
        _requireMinted(tokenId);
	require( idToProduct[tokenId].expiryTime==0 || block.timestamp<=idToProduct[tokenId].expiryTime, "Warranty expired!!!");

        string memory _tokenURI = super.tokenURI(tokenId);
        string memory base = ipfsBaseURI;

        if (bytes(base).length == 0) {
            return (_tokenURI, idToProduct[tokenId].isSold);
        } else {
            return (string(abi.encodePacked(base, _tokenURI)), idToProduct[tokenId].isSold);
        }
    }

    function getContractOwner() public view returns(address) {
        return owner;
    }

    function getSender() public view returns(address) {
        return msg.sender;
    }

    function getCurrentToken() public view returns(uint256) {
        return _tokenIds.current();
    }
    
    // Updates the listing price 
    function updateListingPrice(uint256 _listingPrice) public payable {
        require(owner == msg.sender, "Only Contract Owner can update the listing price");
        listingPrice = _listingPrice;
    }

    // Updates the listing Price
    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    function mintToken(string memory ipfsHash, uint256 price,uint256 expiryDuration, uint256 secretKey) public payable {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, ipfsHash);
        createProduct(newTokenId, price, expiryDuration, secretKey);
        // return newTokenId;
    }


    function createProduct(uint256 tokenId, uint256 price, uint256 expiryDuration, uint256 secretKey) private {
        // price can be zero 
        require(msg.value == listingPrice, "Price must be equal to the listing price");
        
        idToProduct[tokenId] = Product(
            tokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false,
            expiryDuration,
            0,
            secretKey
        );

        _transfer(msg.sender, address(this), tokenId);
        _approve(msg.sender, tokenId);
    }

    //Process sale of the product and activate its warranty period
    //If the creator of the token does not want to sell the NFT to any random people, 
    //he can use the 'secretKey' field to create a secret and share it with his desired buyer.
    //secretKey = 0 means anybody can buy the NFT.
    function buyProduct( uint256 tokenId, uint256 secretKey) public payable {
        _requireMinted(tokenId);
        require(!idToProduct[tokenId].isSold, "Product already sold!!!!");
        require(idToProduct[tokenId].secretKey==0 || idToProduct[tokenId].secretKey == secretKey, "You are not authorized to by this product.");

        uint price = idToProduct[tokenId].price;
        address seller = idToProduct[tokenId].seller;
        uint expiryDuration = idToProduct[tokenId].expiryDuration;


        require(msg.value == price, "Please submit the asking price");
        
        idToProduct[tokenId].owner = payable(msg.sender);
        idToProduct[tokenId].isSold = true;
        idToProduct[tokenId].seller = payable(address(0));
        idToProduct[tokenId].expiryTime = block.timestamp + expiryDuration;

        _transfer(address(this), msg.sender, tokenId);

        payable(owner).transfer(listingPrice);
        payable(seller).transfer(msg.value);
    }

    function burnExpiredToken(uint256 tokenId) public isMintedProduct(tokenId) returns(string memory){
        require(idToProduct[tokenId].expiryTime!=0 || block.timestamp>=idToProduct[tokenId].expiryTime, "Warranty not yet expired!!!");
        require(msg.sender == owner, "You are not the contract owner!!!");
        // If tokenId is sold (expiryTime == 0) and expired anybody can delete the token.

        _burn(tokenId);
        delete idToProduct[tokenId];
        delete activityURIs[tokenId];

        return "Token deleted!!";
    }

    function burnUnSoldProduct(uint256 tokenId) public isMintedProduct(tokenId) returns(string memory) {
        require(idToProduct[tokenId].expiryTime==0, "Product Already sold");
        require(idToProduct[tokenId].seller == msg.sender, "You are not the owner of this token!!!");
        _burn(tokenId);
        delete idToProduct[tokenId];
        delete activityURIs[tokenId];

        return "Token deleted!!";

    }

    modifier isMintedProduct(uint256 tokenId) {
        _requireMinted(tokenId);
        _;
    }

    function ownerShipProof(uint256 tokenId) public view isMintedProduct(tokenId) returns(bool){
        require( block.timestamp<=idToProduct[tokenId].expiryTime, "Warranty expired!!!");
        if(msg.sender == idToProduct[tokenId].owner){
            return true;
        }

        return false;
    }

    function isProductSold(uint256 tokenId) public isMintedProduct(tokenId) view returns(bool) {
        // emit  BooleanValue(idToProduct[tokenId].isSold);
        require( block.timestamp<=idToProduct[tokenId].expiryTime, "Warranty expired!!!");
        return idToProduct[tokenId].isSold;
    }

    function getActivityLog(uint256 tokenId) public isMintedProduct(tokenId) {
        require( block.timestamp<=idToProduct[tokenId].expiryTime, "Warranty expired!!!");
        require(_isApprovedOrOwner(msg.sender, tokenId), "Only creator or owner of the token can view the log");

        emit ArrayValue(activityURIs[tokenId]);
    }

    function transferOwnershipOfProduct(address to, uint256 tokenId) public isMintedProduct(tokenId) payable {
        require( block.timestamp<=idToProduct[tokenId].expiryTime, "Warranty expired!!!");
        require(msg.sender == idToProduct[tokenId].owner, "You are not the owner of this token!!");
        require(idToProduct[tokenId].isSold, "Product not yet sold!!!");

        uint price = idToProduct[tokenId].price;
        address seller = idToProduct[tokenId].owner;


        require(msg.value == price, "Please submit the asking price");
        
        idToProduct[tokenId].owner = payable(to);
        idToProduct[tokenId].seller = payable(seller);

        _transfer(seller, to, tokenId);

        payable(seller).transfer(msg.value);
    }

    function checkExpiryRemaining(uint256 tokenId) public view isMintedProduct(tokenId) returns(uint256){
	require( idToProduct[tokenId].isSold==true, "Product unsold !!!");
        require( block.timestamp<=idToProduct[tokenId].expiryTime, "Warranty expired!!!");
        require(_isApprovedOrOwner(msg.sender, tokenId), "Only creator or owner of the token can check Expiry time remaining");
        uint256 time = idToProduct[tokenId].expiryTime - block.timestamp;
        return time;
    }

}
