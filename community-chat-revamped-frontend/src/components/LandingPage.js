import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './LandingPage.css';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api, { API_ENDPOINTS, WS_ENDPOINTS, APP_ENDPOINTS } from '../config/api';

const LandingPage = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [formData, setFormData] = useState({
    login: { email: '', password: '' },
    signup: { name: '', email: '', password: '', confirmPassword: '' },
    profile: { name: '', bio: '', avatar: null }
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState(new Set());
  const chatEndRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageReactions = useRef({});
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState({});
  const messageRefs = useRef({});
  const client = useRef(null);

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  // Fetch community posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.GET_POSTS);
        setCommunityPosts(response.data);
      } catch (err) {
        setError('Failed to fetch posts. Please try again.');
      }
    };
    fetchPosts();
  }, []);

  // Fetch chat messages when chat is opened
  useEffect(() => {
    const fetchMessages = async () => {
      if (isChatOpen && user) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('http://localhost:8082/api/chat/messages', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setChatMessages(response.data);
          // Scroll to bottom after messages are loaded
          setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } catch (err) {
          setError('Failed to fetch messages. Please try again.');
        }
      }
    };
    fetchMessages();
  }, [isChatOpen, user]);

  // WebSocket connection for real-time chat
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isChatOpen && user) {
      setIsConnecting(true);
      wsRef.current = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8082/ws'),
        onConnect: () => {
          console.log('Connected to WebSocket');
          setIsConnecting(false);
          // Subscribe to messages
          wsRef.current.subscribe('/topic/messages', (message) => {
            const newMessage = JSON.parse(message.body);
            setChatMessages(prev => [...prev, newMessage]);
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          });

          // Subscribe to presence updates
          wsRef.current.subscribe('/topic/presence', (message) => {
            const users = JSON.parse(message.body);
            setOnlineUsers(users);
          });

          // Subscribe to typing indicators
          wsRef.current.subscribe('/topic/typing', (message) => {
            const { userId, username, isTyping } = JSON.parse(message.body);
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              if (isTyping === 'true') {
                newSet.add(username);
              } else {
                newSet.delete(username);
              }
              return newSet;
            });
          });

          // Subscribe to reactions
          wsRef.current.subscribe('/topic/reactions', (message) => {
            const { type, messageId, reaction, userId, emoji } = JSON.parse(message.body);
            messageReactions.current = {
              ...messageReactions.current,
              [messageId]: {
                ...messageReactions.current[messageId],
                [emoji]: type === 'ADD' 
                  ? [...(messageReactions.current[messageId]?.[emoji] || []), userId]
                  : (messageReactions.current[messageId]?.[emoji] || []).filter(id => id !== userId)
              }
            };
          });

          // Announce user joined
          wsRef.current.publish({
            destination: '/app/chat.join',
            body: JSON.stringify({
              userId: user.id,
              username: user.name
            })
          });
        },
        onDisconnect: () => {
          console.log('Disconnected from WebSocket');
          setIsConnecting(true);
          // Announce user left
          if (wsRef.current && user) {
            wsRef.current.publish({
              destination: '/app/chat.leave',
              body: JSON.stringify({
                userId: user.id
              })
            });
          }
        },
        onStompError: (frame) => {
          console.error('STOMP error:', frame);
          setError('Connection error. Please refresh the page.');
          setIsConnecting(false);
        }
      });

      wsRef.current.activate();

      return () => {
        if (wsRef.current) {
          // Announce user left before deactivating
          wsRef.current.publish({
            destination: '/app/chat.leave',
            body: JSON.stringify({
              userId: user.id
            })
          });
          wsRef.current.deactivate();
        }
      };
    }
  }, [isChatOpen, user]);

  // Handle typing indicator
  const handleTyping = (isTyping) => {
    if (!wsRef.current || !user) return;

    wsRef.current.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({
        userId: user.id,
        username: user.name,
        isTyping: isTyping.toString()
      })
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to remove typing indicator after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        wsRef.current.publish({
          destination: '/app/chat.typing',
          body: JSON.stringify({
            userId: user.id,
            username: user.name,
            isTyping: 'false'
          })
        });
      }, 3000);
    }
  };

  const handleInputChange = (formType, field, value) => {
    setFormData(prev => ({
      ...prev,
      [formType]: {
        ...prev[formType],
        [field]: value
      }
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8082/api/auth/login', formData.login);
      setSuccess('Login successful!');
      setIsLoginOpen(false);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.signup.password !== formData.signup.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      const response = await axios.post('http://localhost:8082/api/auth/signup', {
        name: formData.signup.name,
        email: formData.signup.email,
        password: formData.signup.password
      });
      setSuccess('Signup successful! Please login.');
      setIsSignupOpen(false);
      setIsLoginOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.profile.name);
      formDataToSend.append('bio', formData.profile.bio);
      if (formData.profile.avatar) {
        formDataToSend.append('avatar', formData.profile.avatar);
      }

      const response = await axios.put('http://localhost:8082/api/user/profile', formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess('Profile updated successfully!');
      setUser(response.data);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    }
  };

  const handleLikePost = async (postId) => {
    try {
      await api.post(API_ENDPOINTS.LIKE_POST(postId));
      setCommunityPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      ));
    } catch (err) {
      setError('Failed to like post. Please try again.');
    }
  };

  const handleComment = async (postId) => {
    try {
      const response = await api.post(API_ENDPOINTS.ADD_COMMENT(postId), 
        { content: newComment }
      );
      setComments(prev => [...prev, response.data]);
      setNewComment('');
      setCommunityPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, comments: post.comments + 1 } : post
      ));
    } catch (err) {
      setError('Failed to add comment. Please try again.');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', newMessage);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await axios.post('http://localhost:8082/api/chat/messages', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          avatar: file
        }
      }));
    }
  };

  const handleAddReaction = (messageId, emoji) => {
    if (!user) return;

    wsRef.current.publish({
      destination: '/app/chat.reaction.add',
      body: JSON.stringify({
        messageId,
        userId: user.id,
        emoji
      })
    });

    setShowReactionPicker(null);
    setSelectedMessageId(null);
  };

  const handleRemoveReaction = (messageId, emoji) => {
    if (!user) return;

    wsRef.current.publish({
      destination: '/app/chat.reaction.remove',
      body: JSON.stringify({
        messageId,
        userId: user.id,
        emoji
      })
    });
  };

  const toggleReactionPicker = (messageId, event) => {
    event.stopPropagation();
    if (showReactionPicker === messageId) {
      setShowReactionPicker(null);
      setSelectedMessageId(null);
    } else {
      setShowReactionPicker(messageId);
      setSelectedMessageId(messageId);
    }
  };

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showReactionPicker && !event.target.closest('.reaction-picker')) {
        setShowReactionPicker(null);
        setSelectedMessageId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showReactionPicker]);

  const renderMessageContent = (message) => {
    if (message.fileUrl) {
      const isImage = message.fileType?.startsWith('image/');
      const isVideo = message.fileType?.startsWith('video/');
      const isAudio = message.fileType?.startsWith('audio/');

      if (isImage) {
        return (
          <div className="message-file">
            <img 
              src={`http://localhost:8082${message.fileUrl}`} 
              alt={message.fileName}
              className="message-image"
            />
            <p>{message.content}</p>
          </div>
        );
      } else if (isVideo) {
        return (
          <div className="message-file">
            <video 
              controls
              className="message-video"
            >
              <source src={`http://localhost:8082${message.fileUrl}`} type={message.fileType} />
              Your browser does not support the video tag.
            </video>
            <p>{message.content}</p>
          </div>
        );
      } else if (isAudio) {
        return (
          <div className="message-file">
            <audio 
              controls
              className="message-audio"
            >
              <source src={`http://localhost:8082${message.fileUrl}`} type={message.fileType} />
              Your browser does not support the audio tag.
            </audio>
            <p>{message.content}</p>
          </div>
        );
      } else {
        return (
          <div className="message-file">
            <a 
              href={`http://localhost:8082${message.fileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="message-document"
            >
              📎 {message.fileName}
            </a>
            <p>{message.content}</p>
          </div>
        );
      }
    }
    return <p>{message.content}</p>;
  };

  const handleEditMessage = (messageId, content) => {
    setEditingMessageId(messageId);
    setEditMessageContent(content);
  };

  const handleUpdateMessage = async (messageId) => {
    if (!editMessageContent.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8082/api/chat/messages/${messageId}`, 
        { content: editMessageContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditingMessageId(null);
      setEditMessageContent('');
    } catch (err) {
      setError('Failed to update message. Please try again.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8082/api/chat/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      setError('Failed to delete message. Please try again.');
    }
  };

  const handleMessageVisible = (messageId) => {
    if (messageStatuses[messageId] !== 'READ') {
      client.current.publish({
        destination: APP_ENDPOINTS.UPDATE_MESSAGE_STATUS,
        body: JSON.stringify({
          messageId,
          status: 'READ'
        })
      });
      setMessageStatuses(prev => ({
        ...prev,
        [messageId]: 'READ'
      }));
    }
  };

  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'SENT':
        return '✓';
      case 'DELIVERED':
        return '✓✓';
      case 'READ':
        return '✓✓';
      default:
        return '';
    }
  };

  const getMessageStatusColor = (status) => {
    switch (status) {
      case 'SENT':
        return '#999';
      case 'DELIVERED':
        return '#999';
      case 'READ':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <h1>University Portal</h1>
        </div>
        <nav className="nav-buttons">
          {user ? (
            <>
              <button onClick={() => setIsProfileOpen(true)} className="btn-profile">
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" className="avatar" />
                ) : (
                  user.name.charAt(0)
                )}
              </button>
              <button onClick={() => setIsChatOpen(true)} className="btn-chat">
                💬 Chat
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsLoginOpen(true)} className="btn-login">Login</button>
              <button onClick={() => setIsSignupOpen(true)} className="btn-signup">Sign Up</button>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <h2>Welcome to Your Academic Community</h2>
        <p>Connect, collaborate, and grow with your peers</p>
      </section>

      {/* Community Posts Section */}
      <section className="community-posts">
        <h3>Latest Community Posts</h3>
        <div className="posts-grid">
          {communityPosts.map(post => (
            <div key={post.id} className="post-card">
              <h4>{post.title}</h4>
              <p className="author">By {post.author}</p>
              <p className="content">{post.content}</p>
              <div className="post-meta">
                <span>{post.timestamp}</span>
                <button 
                  className="like-button"
                  onClick={() => handleLikePost(post.id)}
                >
                  ❤️ {post.likes}
                </button>
                <button 
                  className="comment-button"
                  onClick={() => {
                    setSelectedPost(post);
                    setIsCommentOpen(true);
                  }}
                >
                  💬 {post.comments}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Login Modal */}
      {isLoginOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Login</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={formData.login.email}
                onChange={(e) => handleInputChange('login', 'email', e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.login.password}
                onChange={(e) => handleInputChange('login', 'password', e.target.value)}
              />
              <button type="submit">Login</button>
            </form>
            <button onClick={() => setIsLoginOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {isSignupOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Sign Up</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <form onSubmit={handleSignup}>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.signup.name}
                onChange={(e) => handleInputChange('signup', 'name', e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.signup.email}
                onChange={(e) => handleInputChange('signup', 'email', e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.signup.password}
                onChange={(e) => handleInputChange('signup', 'password', e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={formData.signup.confirmPassword}
                onChange={(e) => handleInputChange('signup', 'confirmPassword', e.target.value)}
              />
              <button type="submit">Sign Up</button>
            </form>
            <button onClick={() => setIsSignupOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Profile</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <form onSubmit={handleProfileUpdate}>
              <div className="avatar-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  id="avatar-input"
                  className="hidden"
                />
                <label htmlFor="avatar-input" className="avatar-label">
                  {formData.profile.avatar ? (
                    <img 
                      src={URL.createObjectURL(formData.profile.avatar)} 
                      alt="Profile" 
                      className="avatar-preview"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {user?.name?.charAt(0) || '?'}
                    </div>
                  )}
                </label>
              </div>
              <input
                type="text"
                placeholder="Name"
                value={formData.profile.name}
                onChange={(e) => handleInputChange('profile', 'name', e.target.value)}
              />
              <textarea
                placeholder="Bio"
                value={formData.profile.bio}
                onChange={(e) => handleInputChange('profile', 'bio', e.target.value)}
              />
              <button type="submit">Update Profile</button>
            </form>
            <button onClick={() => setIsProfileOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {isCommentOpen && selectedPost && (
        <div className="modal">
          <div className="modal-content">
            <h2>Comments</h2>
            {error && <div className="error-message">{error}</div>}
            <div className="comments-list">
              {comments.map((comment, index) => (
                <div key={index} className="comment">
                  <span className="comment-author">{comment.author}</span>
                  <p>{comment.content}</p>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleComment(selectedPost.id);
            }} className="comment-form">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit">Post</button>
            </form>
            <button onClick={() => setIsCommentOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {isChatOpen && (
        <div className="modal chat-modal">
          <div className="modal-content">
            <h2>Community Chat</h2>
            {error && <div className="error-message">{error}</div>}
            
            {/* Connection Status */}
            {isConnecting && (
              <div className="connection-status">
                Connecting to chat...
              </div>
            )}
            
            {/* Online Users List */}
            <div className="online-users">
              <h3>Online Users ({Object.keys(onlineUsers).length})</h3>
              <div className="online-users-list">
                {Object.entries(onlineUsers).map(([userId, username]) => (
                  <div key={userId} className="online-user">
                    <span className="status-dot"></span>
                    {username}
                  </div>
                ))}
              </div>
            </div>

            <div className="chat-messages">
              {isLoading && <div className="loading-spinner">Loading messages...</div>}
              {chatMessages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`chat-message ${message.user.id === user?.id ? 'sent' : 'received'}`}
                  ref={el => {
                    if (el) {
                      messageRefs.current[message.id] = el;
                      const observer = new IntersectionObserver(
                        ([entry]) => {
                          if (entry.isIntersecting) {
                            handleMessageVisible(message.id);
                          }
                        },
                        { threshold: 0.5 }
                      );
                      observer.observe(el);
                    }
                  }}
                >
                  <span className="message-author">{message.user.name}</span>
                  {editingMessageId === message.id ? (
                    <div className="message-edit">
                      <input
                        type="text"
                        value={editMessageContent}
                        onChange={(e) => setEditMessageContent(e.target.value)}
                        className="edit-input"
                      />
                      <div className="edit-actions">
                        <button onClick={() => handleUpdateMessage(message.id)}>Save</button>
                        <button onClick={() => {
                          setEditingMessageId(null);
                          setEditMessageContent('');
                        }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    renderMessageContent(message)
                  )}
                  {message.user.id === user?.id && (
                    <div className="message-actions">
                      <span
                        className="message-status"
                        style={{ color: getMessageStatusColor(messageStatuses[message.id]) }}
                      >
                        {getMessageStatusIcon(messageStatuses[message.id])}
                      </span>
                      <button
                        className="edit-btn"
                        onClick={() => handleEditMessage(message.id, message.content)}
                      >
                        ✎
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  {/* Reactions */}
                  <div className="message-reactions">
                    {messageReactions.current[message.id] && Object.entries(messageReactions.current[message.id]).map(([emoji, userIds]) => (
                      <span
                        key={emoji}
                        className={`reaction ${userIds.includes(user?.id) ? 'user-reaction' : ''}`}
                        onClick={() => userIds.includes(user?.id) 
                          ? handleRemoveReaction(message.id, emoji)
                          : handleAddReaction(message.id, emoji)
                        }
                      >
                        {emoji} {userIds.length > 1 ? userIds.length : ''}
                      </span>
                    ))}
                    <button
                      className="add-reaction-btn"
                      onClick={(e) => toggleReactionPicker(message.id, e)}
                    >
                      +
                    </button>
                  </div>

                  {/* Reaction Picker */}
                  {showReactionPicker === message.id && (
                    <div className="reaction-picker" onClick={e => e.stopPropagation()}>
                      {commonEmojis.map(emoji => (
                        <button
                          key={emoji}
                          className="emoji-btn"
                          onClick={() => handleAddReaction(message.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Typing Indicators */}
            {typingUsers.size > 0 && (
              <div className="typing-indicators">
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            <form onSubmit={handleSendMessage} className="chat-input">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping(true);
                }}
                onKeyUp={() => handleTyping(true)}
                disabled={isLoading || isConnecting}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="file-input"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                disabled={isLoading || isConnecting}
              />
              <button type="submit" disabled={isLoading || isConnecting}>
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </form>
            <button onClick={() => setIsChatOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage; 