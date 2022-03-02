import { ArrowBackIcon } from "@chakra-ui/icons";
import {
  Box,
  IconButton,
  Text,
  Spinner,
  FormControl,
  Input,
} from "@chakra-ui/react";
import React, { useContext, useEffect, useState } from "react";
import { getMessages, sendMessage } from "../../actions/chatActions";
import { ChatContext } from "../../store/ChatProvider";
import ProfileModal from "../Chats/ProfileModal";
import UpdateGroupChatModal from "./UpdateGroupChatModal";
import "../styles.css";
import ScrollableChat from "./ScrollableChat";
import io from "socket.io-client";
import Lottie from "react-lottie";
import animationData from "../../animations/typing.json";

const ENDPOINT = "http://localhost:5000";
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const { user, selectedChat, setSelectedChat, setNotification, notification } =
    useContext(ChatContext);

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const getSender = (loggedUser, chatUsers, full = false) => {
    if (full) {
      return loggedUser._id === chatUsers[0]._id ? chatUsers[1] : chatUsers[0];
    }

    return loggedUser._id === chatUsers[0]._id
      ? chatUsers[1].name
      : chatUsers[0].name;
  };

  const onSubmit = async (e) => {
    if (e.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      setNewMessage("");
      const data = await sendMessage(selectedChat._id, newMessage);

      socket.emit("new message", data);
      setMessages([...messages, data]);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;

    setLoading(true);
    const messages = await getMessages(selectedChat._id);
    setMessages(messages);
    setLoading(false);

    socket.emit("join chat", selectedChat._id, user);
  };

  useEffect(() => {
    fetchMessages();
    Notification.requestPermission();
    selectedChatCompare = selectedChat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  useEffect(() => {
    // Starting socket connection
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    socket.on("message recieved", (recievedMessage) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== recievedMessage.chat._id
      ) {
        // notification
        if (!notification.includes(recievedMessage)) {
          setNotification([recievedMessage, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, recievedMessage]);
      }
    });
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    // Typing logic
    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }

    let lastTypingTime = new Date().getTime();
    let timerLength = 3000;

    setTimeout(() => {
      let timeNow = new Date().getTime();
      let timeDiff = timeNow - lastTypingTime;

      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };
  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w='100%'
            d='flex'
            fontFamily='Work Sans'
            justifyContent={{ base: "space-between" }}
            alignItems='center'>
            <IconButton
              d={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />

            {!selectedChat.isGroupChat ? (
              <>
                {getSender(user, selectedChat.users)}
                <ProfileModal
                  user={getSender(user, selectedChat.users, true)}
                />
              </>
            ) : (
              <>
                {selectedChat.chatName.toUpperCase()}
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                />
              </>
            )}
          </Text>

          <Box
            d='flex'
            flexDir='column'
            justifyContent='flex-end'
            p={3}
            bg='#E8E8E8'
            w='100%'
            h='100%'
            borderRadius='lg'
            overflowY='hidden'>
            {loading ? (
              <Spinner
                size='xl'
                w={20}
                h={20}
                alignSelf='center'
                margin='auto'
              />
            ) : (
              <div
                style={{ marginBottom: `${isTyping ? "-20px" : "0"}` }}
                className='messages'>
                <ScrollableChat messages={messages} />
              </div>
            )}

            <FormControl onKeyDown={onSubmit} isRequired mt={3}>
              {isTyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    width={70}
                    style={{ marginBottom: 10, marginTop: 10, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}
              <Input
                variant='filled'
                bg='#d8d2d2'
                placeholder='Type a message'
                onChange={typingHandler}
                value={newMessage}
              />
            </FormControl>
          </Box>
        </>
      ) : (
        <Box d='flex' alignItems='center' justifyContent='center' h='100%'>
          <Text fontSize='3xl' pb={3} fontFamily='Work sans'>
            Click on a user to start Chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
