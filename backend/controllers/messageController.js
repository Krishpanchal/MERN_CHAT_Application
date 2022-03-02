const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const { content } = req.body;

  if (!chatId || !content) {
    return next(new AppError("Please provide chatId and the content"));
  }

  const messageData = {
    sender: req.user._id,
    content,
    chat: chatId,
  };

  let message = await Message.create(messageData);
  message = await message.populate("sender", "name pic");
  message = await message.populate("chat");
  message = await User.populate(message, {
    path: "chat.users",
    select: "name pic email",
  });

  if (!message) {
    return next(new AppError("Message not created"));
  }

  await Chat.findByIdAndUpdate(chatId, {
    lastestMessage: message._id,
  });

  res.status(201).json({
    success: true,
    message: message,
  });
});

exports.fetchAllChats = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;

  const messages = await Message.find({ chat: chatId })
    .populate("sender", "name pic email")
    .populate("chat");

  res.status(200).json({
    success: true,
    results: messages.length,
    messages,
  });
});
