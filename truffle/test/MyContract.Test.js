// Import necessary modules from Chai (typically available in Truffle environments)
const chai = import("chai");
const { expect } = chai;

// Get the contract abstraction for MyContract
const MyContract = artifacts.require("MyContract");

// Define a constant for the zero address, as ethers.ZeroAddress is Hardhat/Ethers specific
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// 'contract' is a Truffle-specific global function that provides access to accounts
contract("MyContract", function (accounts) {
  let myContract;
  // accounts array provided by Truffle:
  // accounts[0] is typically the deployer/owner
  const owner = accounts[0];
  const addr1 = accounts[1];
  const addr2 = accounts[2];
  const approved = accounts[3]; // A new account for testing approvals

  // Before each test, deploy a new instance of the contract
  beforeEach(async function () {
    // Deploy the contract with the owner's address as initialOwner
    // MyContract.new() is Truffle's way to deploy, implicitly using accounts[0] if not specified
    myContract = await MyContract.new(owner, { from: owner });
  });

  // Test case for deployment
  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      // Verify that the owner of the contract is the deployer's address
      expect(await myContract.owner()).to.equal(owner);
    });

    it("Should have the correct name and symbol", async function () {
      // Verify the ERC721 token name and symbol
      expect(await myContract.name()).to.equal("MyToken");
      expect(await myContract.symbol()).to.equal("MTK");
    });
  });

  // Test cases for mintAsset function
  describe("mintAsset", function () {
    const tokenId = 1;
    // The contract now automatically generates a URI based on the token ID

    it("Should allow the owner to mint a new token", async function () {
      // Mint a token from the owner's address
      await myContract.mintAsset(addr1, tokenId, { from: owner });

      // Verify that the token balance of addr1 increased
      expect(await myContract.balanceOf(addr1)).to.bignumber.equal("1");
      // Verify that addr1 is the owner of the minted token
      expect(await myContract.ownerOf(tokenId)).to.equal(addr1);
      // Verify the token URI, which is now based on the tokenId
      expect(await myContract.tokenURI(tokenId)).to.equal("ipfs://QmZbWNKJPAjxXuNFSEaksCJVd1M6DaKQViJBYPK2BdpDEP/" + tokenId + ".json");
    });

    it("Should emit a Transfer event on successful mint", async function () {
      // Expect a Transfer event to be emitted when minting
      await expect(myContract.mintAsset(addr1, tokenId, { from: owner }))
        .to.emit(myContract, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1, tokenId); // From address for mint is 0x0
    });

    it("Should not allow non-owners to mint tokens", async function () {
      // Attempt to mint from a non-owner address and expect it to revert
      await expect(myContract.mintAsset(addr1, tokenId, { from: addr1 }))
        .to.be.reverted; // This should revert due to Ownable: caller is not the owner
    });

    it("Should not allow minting with an existing token ID", async function () {
      // Mint the first token
      await myContract.mintAsset(addr1, tokenId, { from: owner });
      // Attempt to mint another token with the same ID and expect it to revert
      await expect(myContract.mintAsset(addr2, tokenId, { from: owner }))
        .to.be.revertedWith("ERC721: token already minted");
    });
  });

  // Test cases for transferAsset function
  describe("transferAsset", function () {
    const tokenId = 1;

    beforeEach(async function () {
      // Mint a token to addr1 before testing transfers
      await myContract.mintAsset(addr1, tokenId, { from: owner });
    });

    it("Should allow the token owner to transfer an asset", async function () {
      // Transfer the token from addr1 to addr2
      await myContract.transferAsset(addr2, tokenId, { from: addr1 });

      // Verify new ownership
      expect(await myContract.ownerOf(tokenId)).to.equal(addr2);
      // Verify balance changes
      expect(await myContract.balanceOf(addr1)).to.bignumber.equal("0");
      expect(await myContract.balanceOf(addr2)).to.bignumber.equal("1");
    });

    it("Should allow an approved address to transfer an asset", async function () {
      // Approve 'approved' to transfer token
      await myContract.approve(approved, tokenId, { from: addr1 });
      // Transfer using the approved address
      await myContract.transferAsset(addr2, tokenId, { from: approved });

      // Verify new ownership
      expect(await myContract.ownerOf(tokenId)).to.equal(addr2);
      expect(await myContract.balanceOf(addr1)).to.bignumber.equal("0");
      expect(await myContract.balanceOf(addr2)).to.bignumber.equal("1");
    });

    it("Should emit a Transfer event on successful transfer", async function () {
      // Expect a Transfer event to be emitted
      await expect(myContract.transferAsset(addr2, tokenId, { from: addr1 }))
        .to.emit(myContract, "Transfer")
        .withArgs(addr1, addr2, tokenId);
    });

    it("Should not allow non-owners or non-approved to transfer an asset", async function () {
      // Attempt to transfer from a non-owner/non-approved (owner) and expect it to revert
      await expect(myContract.transferAsset(addr2, tokenId, { from: owner }))
        .to.be.revertedWith("ERC721: caller is not token owner or approved");
    });

    it("Should not allow transferring a non-existent token", async function () {
      const nonExistentTokenId = 999;
      // Attempt to transfer a token that doesn't exist and expect it to revert
      await expect(myContract.transferAsset(addr2, nonExistentTokenId, { from: addr1 }))
        .to.be.revertedWith("ERC721: invalid token ID");
    });
  });

  // Test cases for tokenURI and supportsInterface overrides
  describe("ERC721 Overrides", function () {
    const tokenId = 1;
    // The contract now automatically generates a URI based on the token ID

    beforeEach(async function () {
      // Mint a token to test URI and interface functions
      await myContract.mintAsset(addr1, tokenId, { from: owner });
    });

    it("Should return the correct token URI", async function () {
      // Verify the combined base URI and custom URI
      expect(await myContract.tokenURI(tokenId)).to.equal("ipfs://QmZbWNKJPAjxXuNFSEaksCJVd1M6DaKQViJBYPK2BdpDEP/" + tokenId + ".json");
    });

    it("Should revert for tokenURI of a non-existent token", async function () {
      const nonExistentTokenId = 999;
      // Expect an error when querying URI for a token that doesn't exist
      await expect(myContract.tokenURI(nonExistentTokenId))
        .to.be.revertedWith("ERC721URIStorage: URI query for nonexistent token");
    });

    it("Should support ERC721 and ERC721Metadata interfaces", async function () {
      // ERC721 interface ID: 0x80ac58cd
      expect(await myContract.supportsInterface("0x80ac58cd")).to.be.true;
      // ERC721Metadata interface ID: 0x5b5e139f
      expect(await myContract.supportsInterface("0x5b5e139f")).to.be.true;
      // ERC165 interface ID (standard for supportsInterface itself): 0x01ffc9a7
      expect(await myContract.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("Should not support a random interface", async function () {
      // Test a random interface ID that should not be supported
      expect(await myContract.supportsInterface("0xffffffff")).to.be.false;
    });
  });
});

