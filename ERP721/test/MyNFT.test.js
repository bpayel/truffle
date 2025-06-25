// test/MyERC721.test.js
const MyERC721 = artifacts.require("MyERC721"); // Truffle's way to get the contract abstraction
const { assert, expect } = require("chai"); // Using Chai for assertions

contract("MyERC721", function (accounts) {
    // accounts is an array of addresses provided by Truffle/Ganache
    const owner = accounts[0];
    const addr1 = accounts[1];
    const addr2 = accounts[2];
    const zeroAddress = '0x0000000000000000000000000000000000000000'; // Ethereum's zero address

    const NAME = "My Awesome NFT Collection";
    const SYMBOL = "MAN";
    const BASE_TOKEN_URI = "https://mycollection.com/nfts/";

    let myERC721Instance; // To hold the deployed contract instance

    beforeEach(async function () {
        // Deploy a fresh contract instance before each test
        myERC721Instance = await MyERC721.new(NAME, SYMBOL, owner, { from: owner });
    });

    // --- Deployment Tests ---
    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            const name = await myERC721Instance.name();
            const symbol = await myERC721Instance.symbol();
            assert.equal(name, NAME, "Contract name should be correct");
            assert.equal(symbol, SYMBOL, "Contract symbol should be correct");
        });

        it("Should assign the owner role to the deployer", async function () {
            const contractOwner = await myERC721Instance.owner();
            assert.equal(contractOwner, owner, "Deployer should be the contract owner");
        });
    });

    // --- mintAsset Tests ---
    describe("mintAsset", function () {
        it("Should allow the owner to mint a new NFT", async function () {
            const tokenId = 1;
            const tokenUri = BASE_TOKEN_URI + tokenId + ".json";

            await myERC721Instance.mintAsset(addr1, tokenId, tokenUri, { from: owner });

            const ownerOfToken = await myERC721Instance.ownerOf(tokenId);
            const balanceAddr1 = await myERC721Instance.balanceOf(addr1);
            const retrievedTokenUri = await myERC721Instance.tokenURI(tokenId);

            assert.equal(ownerOfToken, addr1, "addr1 should own the minted token");
            assert.equal(balanceAddr1.toNumber(), 1, "addr1 balance should be 1");
            assert.equal(retrievedTokenUri, tokenUri, "Token URI should be set correctly");
        });

        it("Should emit a Transfer event when minting", async function () {
            const tokenId = 2;
            const tokenUri = BASE_TOKEN_URI + tokenId + ".json";

            const tx = await myERC721Instance.mintAsset(addr1, tokenId, tokenUri, { from: owner });

            // Check event logs
            expect(tx.logs[0].event).to.equal("Transfer");
            expect(tx.logs[0].args.from).to.equal(zeroAddress);
            expect(tx.logs[0].args.to).to.equal(addr1);
            expect(tx.logs[0].args.tokenId.toNumber()).to.equal(tokenId);
        });

        it("Should not allow non-owners to mint", async function () {
            const tokenId = 3;
            const tokenUri = BASE_TOKEN_URI + tokenId + ".json";

            // Using Chai's .to.be.reverted for revert checks
            await expect(myERC721Instance.mintAsset(addr1, tokenId, tokenUri, { from: addr1 }))
                .to.be.revertedWith("OwnableUnauthorizedAccount"); // OpenZeppelin's custom error for Ownable
        });

        it("Should not allow minting to the zero address", async function () {
            const tokenId = 4;
            const tokenUri = BASE_TOKEN_URI + tokenId + ".json";

            await expect(myERC721Instance.mintAsset(zeroAddress, tokenId, tokenUri, { from: owner }))
                .to.be.revertedWith("ERC721: mint to the zero address");
        });

        it("Should not allow minting an already existing token ID", async function () {
            const tokenId = 5;
            const tokenUri = BASE_TOKEN_URI + tokenId + ".json";

            await myERC721Instance.mintAsset(owner, tokenId, tokenUri, { from: owner });

            await expect(myERC721Instance.mintAsset(addr1, tokenId, tokenUri, { from: owner }))
                .to.be.revertedWith("ERC721: token already minted");
        });
    });

    // --- transferAsset Tests ---
    describe("transferAsset", function () {
        const tokenId = 10;
        const tokenUri = BASE_TOKEN_URI + tokenId + ".json";

        beforeEach(async function () {
            // Mint an NFT to owner before each transferAsset test
            await myERC721Instance.mintAsset(owner, tokenId, tokenUri, { from: owner });
        });

        it("Should allow the owner to transfer an NFT", async function () {
            await myERC721Instance.transferAsset(addr1, tokenId, { from: owner });

            const newOwner = await myERC721Instance.ownerOf(tokenId);
            const ownerBalance = await myERC721Instance.balanceOf(owner);
            const addr1Balance = await myERC721Instance.balanceOf(addr1);

            assert.equal(newOwner, addr1, "Token should be owned by addr1");
            assert.equal(ownerBalance.toNumber(), 0, "Owner balance should be 0");
            assert.equal(addr1Balance.toNumber(), 1, "addr1 balance should be 1");
        });

        it("Should emit a Transfer event when transferring", async function () {
            const tx = await myERC721Instance.transferAsset(addr1, tokenId, { from: owner });

            expect(tx.logs[0].event).to.equal("Transfer");
            expect(tx.logs[0].args.from).to.equal(owner);
            expect(tx.logs[0].args.to).to.equal(addr1);
            expect(tx.logs[0].args.tokenId.toNumber()).to.equal(tokenId);
        });

        it("Should allow an approved address to transfer an NFT", async function () {
            await myERC721Instance.approve(addr1, tokenId, { from: owner });
            const approvedAddress = await myERC721Instance.getApproved(tokenId);
            assert.equal(approvedAddress, addr1, "addr1 should be approved for tokenId");

            await myERC721Instance.transferAsset(addr2, tokenId, { from: addr1 }); // addr1 transfers

            const newOwner = await myERC721Instance.ownerOf(tokenId);
            assert.equal(newOwner, addr2, "Token should be owned by addr2 after transfer by approved address");
        });

        it("Should allow an operator to transfer an NFT", async function () {
            await myERC721Instance.setApprovalForAll(addr1, true, { from: owner });
            const isApproved = await myERC721Instance.isApprovedForAll(owner, addr1);
            assert.isTrue(isApproved, "addr1 should be an operator for owner");

            await myERC721Instance.transferAsset(addr2, tokenId, { from: addr1 }); // addr1 (operator) transfers

            const newOwner = await myERC721Instance.ownerOf(tokenId);
            assert.equal(newOwner, addr2, "Token should be owned by addr2 after transfer by operator");
        });

        it("Should not allow a non-owner/non-approved address to transfer an NFT", async function () {
            await expect(myERC721Instance.transferAsset(addr2, tokenId, { from: addr1 }))
                .to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
        });

        it("Should not allow transfer of a non-existent token", async function () {
            const nonExistentTokenId = 999;
            await expect(myERC721Instance.transferAsset(addr1, nonExistentTokenId, { from: owner }))
                .to.be.revertedWith("ERC721: invalid token ID");
        });

        it("Should not allow transferring to the zero address", async function () {
            await expect(myERC721Instance.transferAsset(zeroAddress, tokenId, { from: owner }))
                .to.be.revertedWith("ERC721: transfer to the zero address");
        });
    });

    // --- ERC721 Standard Functionality Tests (brief examples) ---
    describe("ERC721 Standard Functions", function () {
        const tokenId = 20;
        const tokenUri = BASE_TOKEN_URI + tokenId + ".json";

        beforeEach(async function () {
            await myERC721Instance.mintAsset(owner, tokenId, tokenUri, { from: owner });
        });

        it("Should return the correct ownerOf", async function () {
            const ownerOfToken = await myERC721Instance.ownerOf(tokenId);
            assert.equal(ownerOfToken, owner, "Owner of token should be correct");
        });

        it("Should return the correct balanceOf", async function () {
            const ownerBalance = await myERC721Instance.balanceOf(owner);
            const addr1Balance = await myERC721Instance.balanceOf(addr1);
            assert.equal(ownerBalance.toNumber(), 1, "Owner balance should be 1");
            assert.equal(addr1Balance.toNumber(), 0, "addr1 balance should be 0");
        });

        it("Should correctly handle approvals (approve, getApproved)", async function () {
            await myERC721Instance.approve(addr1, tokenId, { from: owner });
            const approvedAddress = await myERC721Instance.getApproved(tokenId);
            assert.equal(approvedAddress, addr1, "Approved address should be addr1");
        });

        it("Should correctly handle setApprovalForAll and isApprovedForAll", async function () {
            await myERC721Instance.setApprovalForAll(addr1, true, { from: owner });
            let isApproved = await myERC721Instance.isApprovedForAll(owner, addr1);
            assert.isTrue(isApproved, "addr1 should be an approved operator");

            await myERC721Instance.setApprovalForAll(addr1, false, { from: owner });
            isApproved = await myERC721Instance.isApprovedForAll(owner, addr1);
            assert.isFalse(isApproved, "addr1 should no longer be an approved operator");
        });

        it("Should correctly implement safeTransferFrom", async function () {
            await myERC721Instance.approve(addr1, tokenId, { from: owner });

            // Truffle's syntax for calling overload functions
            await myERC721Instance["safeTransferFrom(address,address,uint256)"](owner, addr2, tokenId, { from: addr1 });

            const newOwner = await myERC721Instance.ownerOf(tokenId);
            const ownerBalance = await myERC721Instance.balanceOf(owner);
            const addr2Balance = await myERC721Instance.balanceOf(addr2);

            assert.equal(newOwner, addr2, "Token should be owned by addr2 after safeTransferFrom");
            assert.equal(ownerBalance.toNumber(), 0, "Owner balance should be 0");
            assert.equal(addr2Balance.toNumber(), 1, "addr2 balance should be 1");
        });
    });
});