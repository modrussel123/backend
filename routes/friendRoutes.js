const express = require("express");
const router = express.Router();
const Friend = require("../models/Friend");
const User = require("../models/User");
const authMiddleware = require('../middleware/auth');
const UserFriend = require("../models/Userfriend");

router.post("/request", authMiddleware, async (req, res) => {
    try {
        const { receiverEmail } = req.body;
        const senderEmail = req.user.email;

        if (senderEmail === receiverEmail) {
            return res.status(400).json({ message: "Cannot send friend request to yourself" });
        }

                let senderFriend = await UserFriend.findOne({ userId: senderEmail });
        if (!senderFriend) {
            senderFriend = new UserFriend({ userId: senderEmail, friends: [] });
        }

                let receiverFriend = await UserFriend.findOne({ userId: receiverEmail });
        if (!receiverFriend) {
            receiverFriend = new UserFriend({ userId: receiverEmail, friends: [] });
        }

                const existingFriendship = senderFriend.friends.find(f => f.friendId === receiverEmail);
        if (existingFriendship && existingFriendship.status !== 'rejected') {
            return res.status(400).json({ message: "Friend request already exists" });
        }

                if (existingFriendship && existingFriendship.status === 'rejected') {
            senderFriend.friends = senderFriend.friends.filter(f => f.friendId !== receiverEmail);
            receiverFriend.friends = receiverFriend.friends.filter(f => f.friendId !== senderEmail);
        }

                senderFriend.friends.push({
            friendId: receiverEmail,
            status: 'pending',
            initiator: senderEmail
        });

        receiverFriend.friends.push({
            friendId: senderEmail,
            status: 'pending',
            initiator: senderEmail
        });

        await senderFriend.save();
        await receiverFriend.save();

        res.status(201).json({ message: "Friend request sent successfully" });

    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ message: "Failed to send friend request" });
    }
});

router.get("/requests", authMiddleware, async (req, res) => {
    try {
        const userFriend = await UserFriend.findOne({ userId: req.user.email });
        if (!userFriend) {
            return res.json([]);
        }

                const pendingRequests = userFriend.friends.filter(f => 
            f.status === 'pending' && f.initiator !== req.user.email
        );
        
                const requests = await Promise.all(
            pendingRequests.map(async (request) => {
                const sender = await User.findOne({ email: request.friendId })
                    .select('firstName lastName email profilePicture');
                return {
                    _id: request._id,
                    sender,
                    createdAt: request.createdAt
                };
            })
        );

        res.json(requests);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ message: "Failed to fetch friend requests" });
    }
});

router.get("/sent-requests", authMiddleware, async (req, res) => {
    try {
        const userFriend = await UserFriend.findOne({ userId: req.user.email });
        if (!userFriend) {
            return res.json([]);
        }

                const sentRequests = userFriend.friends.filter(f => 
            f.status === 'pending' && f.initiator === req.user.email
        );
        
        const requests = await Promise.all(
            sentRequests.map(async (request) => {
                const receiver = await User.findOne({ email: request.friendId })
                    .select('firstName lastName email profilePicture');
                return {
                    _id: request._id,
                    receiver,
                    createdAt: request.createdAt
                };
            })
        );

        res.json(requests);
    } catch (error) {
        console.error('Error fetching sent requests:', error);
        res.status(500).json({ message: "Failed to fetch sent requests" });
    }
});

router.get("/search", authMiddleware, async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email })
            .select('firstName lastName email profilePicture course height weight gender age phoneNumber isPrivate');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

                const userFriend = await UserFriend.findOne({
            userId: req.user.email,
            'friends.friendId': email
        });

        let friendshipStatus = "none";
        if (userFriend) {
            const friend = userFriend.friends.find(f => f.friendId === email);
            friendshipStatus = friend ? friend.status : "none";
        }

        const responseData = {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture,
            course: user.course,
            gender: user.gender,
            phoneNumber: user.phoneNumber,
            isPrivate: user.isPrivate,
            friendshipStatus
        };

        res.json(responseData);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: "Error searching for user" });
    }
});



router.post("/accept", authMiddleware, async (req, res) => {
    try {
        const { requestId } = req.body;
        const userEmail = req.user.email;

                const userFriend = await UserFriend.findOne({ userId: userEmail });
        if (!userFriend) {
            return res.status(404).json({ message: "Friend request not found" });
        }

                const friendRequest = userFriend.friends.id(requestId);
        if (!friendRequest) {
            return res.status(404).json({ message: "Friend request not found" });
        }

                friendRequest.status = 'accepted';

                const senderFriend = await UserFriend.findOne({ userId: friendRequest.friendId });
        if (senderFriend) {
            const senderRequest = senderFriend.friends.find(
                f => f.friendId === userEmail
            );
            if (senderRequest) {
                senderRequest.status = 'accepted';
                await senderFriend.save();
            }
        }

        await userFriend.save();
        res.json({ message: "Friend request accepted" });

    } catch (error) {
        console.error('Error accepting request:', error);
        res.status(500).json({ message: "Failed to accept request" });
    }
});
router.post("/reject", authMiddleware, async (req, res) => {
    try {
        const { requestId } = req.body;
        const userEmail = req.user.email;

                const userFriend = await UserFriend.findOne({ userId: userEmail });
        if (!userFriend) {
            return res.status(404).json({ message: "Friend request not found" });
        }

                const friendRequest = userFriend.friends.id(requestId);
        if (!friendRequest) {
            return res.status(404).json({ message: "Friend request not found" });
        }

                friendRequest.status = 'rejected';

                const senderFriend = await UserFriend.findOne({ userId: friendRequest.friendId });
        if (senderFriend) {
            const senderRequest = senderFriend.friends.find(
                f => f.friendId === userEmail
            );
            if (senderRequest) {
                senderRequest.status = 'rejected';
                await senderFriend.save();
            }
        }

        await userFriend.save();
        res.json({ message: "Friend request rejected" });

    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ message: "Failed to reject request" });
    }
});

router.post("/remove", authMiddleware, async (req, res) => {
    try {
        const { friendEmail } = req.body;
        const userEmail = req.user.email;

                await UserFriend.updateOne(
            { userId: userEmail },
            { $pull: { friends: { friendId: friendEmail } } }
        );

        await UserFriend.updateOne(
            { userId: friendEmail },
            { $pull: { friends: { friendId: userEmail } } }
        );

                res.status(200).json({ message: "Friend removed successfully" });
    } catch (error) {
        console.error("Error removing friend:", error);
        res.status(500).json({ message: "Failed to remove friend" });
    }
});

router.post("/cancel-request", authMiddleware, async (req, res) => {
    try {
        const { receiverEmail } = req.body;
        const senderEmail = req.user.email;

                const senderFriend = await UserFriend.findOne({ userId: senderEmail });
        if (senderFriend) {
            senderFriend.friends = senderFriend.friends.filter(
                f => f.friendId !== receiverEmail
            );
            await senderFriend.save();
        }

                const receiverFriend = await UserFriend.findOne({ userId: receiverEmail });
        if (receiverFriend) {
            receiverFriend.friends = receiverFriend.friends.filter(
                f => f.friendId !== senderEmail
            );
            await receiverFriend.save();
        }

        res.json({ message: "Friend request cancelled successfully" });
    } catch (error) {
        console.error('Error cancelling request:', error);
        res.status(500).json({ message: "Failed to cancel friend request" });
    }
});

router.get("/list", authMiddleware, async (req, res) => {
    try {
        const userFriend = await UserFriend.findOne({ userId: req.user.email });
        if (!userFriend) {
            return res.json([]);
        }

        const acceptedFriends = userFriend.friends.filter(f => f.status === 'accepted');
        
        const friendsList = await Promise.all(
            acceptedFriends.map(async (friend) => {
                const friendUser = await User.findOne({ email: friend.friendId })
                    .select('firstName lastName email profilePicture course height weight gender age phoneNumber isPrivate')
                    .lean();
                
                if (!friendUser) {
                    return null;
                }

                                return {
                    _id: friend._id,
                    email: friendUser.email,
                    firstName: friendUser.firstName,
                    lastName: friendUser.lastName,
                    weight: friendUser.weight,
                    height: friendUser.height,
                    age: friendUser.age,
                    gender: friendUser.gender,
                    course: friendUser.course,
                    phoneNumber: friendUser.phoneNumber,                     profilePicture: friendUser.profilePicture,
                    isPrivate: friendUser.isPrivate
                };
            })
        ).then(list => list.filter(friend => friend !== null));

        res.json(friendsList);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ message: "Failed to fetch friends list" });
    }
});

module.exports = router;