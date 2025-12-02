import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { initializeApp } from "firebase/app";
import { 
    getFirestore, doc, collection, addDoc, onSnapshot, setDoc, getDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { supabase, supabaseIsMock } from './supabaseClient';
import Auth from './Auth';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAGzmlhziHPgYgESRmhABjuoEOud4OiSo8", 
  authDomain: "pwartc.firebaseapp.com", 
  projectId: "pwartc", 
  storageBucket: "pwartc.appspot.com",
  messagingSenderId: "438767032334", 
  appId: "1:438767032334:web:a9afa6fda42a8b0a4b845f", 
  measurementId: "G-ZD5021SDSN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- WebRTC Configuration ---
const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
  iceCandidatePoolSize: 10,
};

// --- Main Application ---
function App() {
    const [page, setPage] = useState('home');
  const [roomId, setRoomId] = useState('');
  const [session, setSession] = useState(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
    const [firestoreAvailable, setFirestoreAvailable] = useState(true);
    const [supabaseAvailable, setSupabaseAvailable] = useState(!supabaseIsMock);
    const [lastCloudError, setLastCloudError] = useState(null);

  useEffect(() => {
    // Check for network status
    const handleNetworkChange = () => {
      const isOffline = !navigator.onLine;
      setOfflineMode(isOffline);
      
      if (isOffline) {
        console.log("App is offline. Using cached data.");
      } else {
        console.log("App is online. Syncing data if needed.");
      }
    };

    // Set initial network status
    handleNetworkChange();

    // Add event listeners for network status changes
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    // Auto-login without requiring user input - disabled to allow manual entry
    /*
    const autoLogin = async () => {
      // Check if we have cached user data
      const cachedUser = localStorage.getItem('cachedUser');
      
      let mockSession;
      if (cachedUser) {
        mockSession = JSON.parse(cachedUser);
      } else {
        // Create a mock session with a fake user
        mockSession = {
          user: {
            id: 'auto-user-123',
            email: 'auto@example.com',
            user_metadata: { name: 'Auto User' }
          }
        };
        // Cache the user data
        localStorage.setItem('cachedUser', JSON.stringify(mockSession));
      }
      
      // Set the mock session directly
      setSession(mockSession);
      setCloudSyncEnabled(true);
      
      // Check if we were in a room before going offline
      const lastConnectionState = localStorage.getItem('lastConnectionState');
      if (lastConnectionState) {
        const { roomId, isConnected } = JSON.parse(lastConnectionState);
        if (roomId) {
          // If we were in a room, go back to it
          setRoomId(roomId);
          setPage('room');
        }
      }
    };
    
    // Run auto-login immediately
    autoLogin();
    */
    
        return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

    // Check supabase connectivity quickly when app mounts
    useEffect(() => {
        const checkSupabase = async () => {
            if (supabaseIsMock) { setSupabaseAvailable(false); return; }
            try {
                // lightweight API call: fetch user session or ping any table
                await supabase.from('notes').select('room_id').limit(1);
                setSupabaseAvailable(true);
            } catch (err) {
                console.error('Supabase check failed', err);
                setSupabaseAvailable(false);
                setLastCloudError(err.message || String(err));
            }
        };
        checkSupabase();
    }, []);

    // Check Firestore connectivity (quick test) when app mounts
    useEffect(() => {
        const checkFirestore = async () => {
            try {
                // a simple read - doc may not exist, but errors indicate connectivity/auth issues
                await getDoc(doc(db, 'rooms', 'ping-health-check'));
                setFirestoreAvailable(true);
            } catch (err) {
                console.warn('Firestore connectivity check failed', err);
                setFirestoreAvailable(false);
            }
        };
        checkFirestore();
    }, []);

    const checkConnectivity = async () => {
        // Re-check Supabase and Firestore
        try { await supabase.from('notes').select('room_id').limit(1); setSupabaseAvailable(true); setLastCloudError(null); }
        catch (err) { setSupabaseAvailable(false); setLastCloudError(err.message || String(err)); }
        try { await getDoc(doc(db, 'rooms', 'ping-health-check')); setFirestoreAvailable(true); }
        catch (err) { setFirestoreAvailable(false); console.warn('Firestore check failed on retry', err); }
    };

  const goToRoom = (id = '') => {
    setRoomId(id);
    setPage('room');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Direct entry function - no login required
  const handleDirectEntry = () => {
    // Create a guest session
    const guestSession = {
      user: {
        id: 'guest-' + Math.random().toString(36).substring(2, 10),
        email: 'guest@example.com',
        user_metadata: { name: 'Guest User' }
      }
    };
    
    // Cache the user data for persistence
    localStorage.setItem('cachedUser', JSON.stringify(guestSession));
    
    // Set the session directly
    setSession(guestSession);
    
    // Enable cloud sync
    setCloudSyncEnabled(true);
  };

    return (
        <div className="app-root bg-gray-900 text-white min-h-screen font-sans">
            <Header session={session} onLogout={handleLogout} supabaseAvailable={supabaseAvailable} firestoreAvailable={firestoreAvailable} />
                <div className="container mx-auto px-4 py-2 text-center">
                      <div className="inline-flex gap-3 items-center text-sm text-gray-400">
                        <span className={`px-2 py-1 rounded ${!offlineMode ? 'bg-green-500/10 text-green-300' : 'bg-red-600/10 text-red-300'}`}>{!offlineMode ? 'Online' : 'Offline'}</span>
                        <span className={`px-2 py-1 rounded ${supabaseAvailable ? 'bg-green-500/10 text-green-300' : 'bg-yellow-600/10 text-yellow-300'}`}>{supabaseAvailable ? 'Cloud OK' : 'Cloud Disabled'}</span>
                        <span className={`px-2 py-1 rounded ${firestoreAvailable ? 'bg-green-500/10 text-green-300' : 'bg-yellow-600/10 text-yellow-300'}`}>{firestoreAvailable ? 'Signaling OK' : 'Signaling Error'}</span>
                        <button onClick={checkConnectivity} className="ml-2 px-3 py-1 bg-blue-500/10 hover:bg-blue-600/10 rounded text-blue-300 text-xs">Retry</button>
                    </div>
                    {lastCloudError && <div className="mt-2 text-sm text-red-400">Cloud error: {lastCloudError}</div>}
                </div>
                {supabaseIsMock && (
                    <div className="w-full text-center py-2 bg-yellow-600/10 text-yellow-300 text-sm border-b border-yellow-900/30">
                        Cloud features are disabled. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable cloud sync.
                    </div>
                )}
        <main className="container mx-auto px-4 py-8">
            {!session ? (
              <>
                <div className="text-center max-w-lg mx-auto">
                  <h2 className="text-4xl font-extrabold text-white mb-4">Socialise</h2>
                  <p className="text-gray-400 mb-8">Start using Connect  without any login required.</p>
                  
                  <button 
                    onClick={handleDirectEntry}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-blue-500/50 text-lg"
                  >
                    Enter Application
                  </button>
                </div>
              </>
            ) : (
              <>
                {page === 'home' && <HomePage goToRoom={goToRoom} />}
                {page === 'room' && (
                  <RoomPage 
                    initialRoomId={roomId} 
                    goHome={() => setPage('home')} 
                    cloudSync={cloudSyncEnabled}
                    userId={session.user.id}
                  />
                )}
              </>
            )}
        </main>
    </div>
  );
}

// --- Components ---

function PwaInstaller() {
    const [installPrompt, setInstallPrompt] = useState(null);
    
    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        });
    }, []);
    
    const handleInstallClick = () => {
        if (!installPrompt) return;
        
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            setInstallPrompt(null);
        });
    };
    
    if (!installPrompt) return null;
    
    return (
        <button 
            onClick={handleInstallClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install App
        </button>
    );
}

function Header({ session, onLogout, supabaseAvailable, firestoreAvailable }) {
    const cloudWarning = !supabaseAvailable;
    return (
        <header className="bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-blue-900/50">
            <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
                <h1 className="text-lg sm:text-2xl font-bold">Conn<span className="text-blue-500">Ect</span> <span className="text-sm font-light text-gray-400">Socialise offline</span></h1>
                <div className="flex items-center gap-4">
                    {cloudWarning && (
                        <div className="text-yellow-300 text-sm px-2 py-1 rounded bg-yellow-900/10">Cloud Disabled</div>
                    )}
                    {session && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-green-400">{session.user.email}</span>
                            <button 
                                onClick={onLogout}
                                className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                    <PwaInstaller />
                </div>
            </nav>
        </header>
    );
}

function HomePage({ goToRoom }) {
  const [joinId, setJoinId] = useState('');
  return (
    <div className="text-center max-w-lg mx-auto">
      <h2 className="text-4xl font-extrabold text-white mb-4">Offline First</h2>
      <p className="text-gray-400 mb-8">Create a room to start a session or join an existing one using a Room ID.</p>
      
    <div className="card p-8">
         <button onClick={() => goToRoom()} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-blue-500/50 text-lg">
            Create New Room
        </button>
        <div className="my-6 flex items-center">
            <hr className="flex-grow border-gray-600" />
            <span className="px-4 text-gray-500">OR</span>
            <hr className="flex-grow border-gray-600" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <input 
                type="text"
                placeholder="Enter Room ID to join"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button onClick={() => joinId && goToRoom(joinId)} disabled={!joinId} className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-md font-semibold hover:from-green-600 hover:to-green-700 disabled:from-gray-500 disabled:to-gray-600 transition-all shadow-lg hover:shadow-green-500/50">
                Join Room
            </button>
        </div>
      </div>
    </div>
  );
}

function VideoStream({ stream, muted = false }) {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="bg-black rounded-lg overflow-hidden h-40 shadow-lg ring-1 ring-white/10">
            <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
        </div>
    );
}

function RoomPage({ initialRoomId, goHome, cloudSync, userId }) {
    const pc = useRef(null);
    const dataChannel = useRef(null);
    const [status, setStatus] = useState('Initializing...');
    const [currentRoomId, setCurrentRoomId] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimerRef = useRef(null);
    const reconnectNowRef = useRef(null);
    const cancelReconnectRef = useRef(null);
    const initRef = useRef(null);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const MAX_RECONNECT_ATTEMPTS = 5;
    
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [sharedNotes, setSharedNotes] = useState('');
    const [receivedFiles, setReceivedFiles] = useState([]);
    const [displayedContent, setDisplayedContent] = useState(null);

    const fileChunks = useRef([]);
    
    useEffect(() => {
        pc.current = new RTCPeerConnection(servers);
        const peerConnection = pc.current;
        let roomRef;
        const unsubscribes = [];

        const setupMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                
                // Check if peerConnection is still valid before adding tracks
                if (peerConnection.signalingState !== 'closed') {
                    stream.getTracks().forEach(track => {
                        try {
                            peerConnection.addTrack(track, stream);
                        } catch (trackErr) {
                            console.error("Error adding track:", trackErr);
                        }
                    });
                } else {
                    console.warn("Cannot add tracks - peer connection is closed");
                }
                return true;
            } catch (err) {
                console.error("Error accessing media devices.", err);
                setStatus("Error: Could not access camera or microphone. Continuing with chat only.");
                // Continue with data channel only if media fails
                return false;
            }
        };

        peerConnection.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log("Connection state:", peerConnection.connectionState);
            if (peerConnection.connectionState === 'connected') {
                setIsConnected(true);
                setStatus('Connection successful! Ready to collaborate.');
                // Reset reconnect attempts on a successful connection
                reconnectAttemptsRef.current = 0;
                if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
                setIsReconnecting(false);
            } else if (peerConnection.connectionState === 'disconnected' || 
                      peerConnection.connectionState === 'failed' ||
                      peerConnection.connectionState === 'closed') {
                setIsConnected(false);
                setStatus(`Connection ${peerConnection.connectionState}. Trying to reconnect...`);
                // Start automatic reconnect attempts (exponential backoff)
                const startReconnect = () => {
                    if (reconnectAttemptsRef.current > 0) return;
                    setIsReconnecting(true);
                    reconnectAttemptsRef.current = 0;
                    scheduleReconnect();
                    // Expose a manual reconnect function to the outer scope
                    reconnectNowRef.current = async () => {
                        try {
                            if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
                            if (pc.current && pc.current.signalingState !== 'closed') { try { pc.current.close(); } catch (err) {} }
                            await init();
                        } catch (err) {
                            console.error('Manual reconnect failed:', err);
                        }
                    };
                    // Expose a cancel reconnection function
                    cancelReconnectRef.current = () => {
                        if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
                        reconnectAttemptsRef.current = 0;
                        setIsReconnecting(false);
                        setStatus('Reconnect canceled.');
                    };
                };
                const scheduleReconnect = () => {
                    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                        setStatus('Reconnect failed after multiple attempts.');
                        setIsReconnecting(false);
                        return;
                    }
                    reconnectAttemptsRef.current += 1;
                    const delay = Math.min(30000, Math.pow(2, reconnectAttemptsRef.current) * 1000);
                    setStatus(`Reconnecting attempt ${reconnectAttemptsRef.current} in ${Math.round(delay/1000)}s...`);
                    reconnectTimerRef.current = setTimeout(async () => {
                        try {
                            // close old peer connection safely
                            if (pc.current && pc.current.signalingState !== 'closed') {
                                try { pc.current.close(); } catch (err) { console.warn('Error closing pc during reconnect', err); }
                            }
                        } catch (_) {}
                        try {
                            // Call init again to re-create peer connection and re-initialize flows
                            await init();
                        } catch (err) {
                            console.error('Reconnection init failed', err);
                        }
                        // if still not connected, schedule next.
                        if (!pc.current || pc.current.connectionState !== 'connected') {
                            scheduleReconnect();
                        } else {
                            // successful reconnect
                            reconnectAttemptsRef.current = 0;
                            setIsReconnecting(false);
                        }
                    }, delay);
                };
                // Immediately start reconnect sequence
                startReconnect();
            }
        };

        const setupDataChannelEvents = (channel) => {
             channel.onmessage = (event) => {
                 try {
                     const data = JSON.parse(event.data);
                     if (data.type === 'notes') {
                         setSharedNotes(data.content);
                    } else if (data.type === 'url' || data.type === 'video-url') {
                        // remote side shared a URL (YouTube or a direct video link)
                        const { name, url } = data.value || {};
                        setReceivedFiles(prev => [...prev, { name: name || url, url, type: 'video/url' }]);
                        setDisplayedContent({ name: name || url, url, type: 'video/url' });
                     } else if (data.type === 'file') {
                         const { done, value } = data;
                         if (done) {
                             const receivedBlob = new Blob(fileChunks.current, { type: value.type });
                             const newFile = { name: value.name, blob: receivedBlob };
                             setReceivedFiles(prev => [...prev, newFile]);
                             setDisplayedContent(newFile);
                             fileChunks.current = [];
                         } else {
                             fileChunks.current.push(new Uint8Array(value));
                         }
                     }
                 } catch (error) { console.error("Failed to parse data channel message:", error); }
             };
             channel.onopen = () => { 
                setIsConnected(true); 
                setStatus('Connection successful! Ready to collaborate.'); 
                
                // Save connection state to localStorage for offline detection
                localStorage.setItem('lastConnectionState', JSON.stringify({
                    roomId: currentRoomId,
                    timestamp: Date.now(),
                    isConnected: true
                }));
             };
             channel.onclose = () => { 
                setIsConnected(false); 
                setStatus('Connection closed by peer.'); 
                
                // Update localStorage with disconnected state
                localStorage.setItem('lastConnectionState', JSON.stringify({
                    roomId: currentRoomId,
                    timestamp: Date.now(),
                    isConnected: false
                }));
             };
             channel.onerror = (error) => { 
                console.error("Data channel error:", error); 
                setStatus("Connection error."); 
             };
        };

        peerConnection.ondatachannel = (event) => {
            dataChannel.current = event.channel;
            setupDataChannelEvents(dataChannel.current);
        };
        
        const init = async () => {
            // Clean up any previous listeners before reinitializing
            try { if (unsubscribes && unsubscribes.length) { unsubscribes.forEach(un => un()); unsubscribes.length = 0; } } catch (err) { console.warn('Error clearing previous unsubscribes', err); }
            const mediaSuccess = await setupMedia();

            if (initialRoomId) { // JOINER
                setStatus(`Joining room: ${initialRoomId}...`);
                roomRef = doc(db, 'rooms', initialRoomId);
                setCurrentRoomId(initialRoomId);

                const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
                peerConnection.onicecandidate = (event) => event.candidate && addDoc(calleeCandidatesCollection, event.candidate.toJSON());

                const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
                    if (snapshot.exists() && snapshot.data()?.offer && !peerConnection.currentRemoteDescription) {
                        setStatus('Peer found. Sending answer...');
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(snapshot.data().offer));
                        const answerDescription = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answerDescription);
                        await updateDoc(roomRef, { answer: { sdp: answerDescription.sdp, type: answerDescription.type } });
                        
                        const unsubCaller = onSnapshot(collection(roomRef, 'callerCandidates'), (snap) => snap.docChanges().forEach((change) => change.type === 'added' && peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()))));
                        unsubscribes.push(unsubCaller);
                    } else if (!snapshot.exists()) {
                        setStatus(`Error: Room ${initialRoomId} not found.`);
                    }
                });
                unsubscribes.push(unsubscribe);

            } else { // CREATOR
                setStatus('Creating new room...');
                
                // Create data channel first to ensure it's available
                try {
                    if (peerConnection.signalingState !== 'closed') {
                        dataChannel.current = peerConnection.createDataChannel('mainChannel');
                        setupDataChannelEvents(dataChannel.current);
                    } else {
                        console.warn("Cannot create data channel - peer connection is closed");
                        setStatus("Initialization failed: Peer connection is closed. Please refresh the page.");
                        return;
                    }
                } catch (err) {
                    console.error("Error creating data channel:", err);
                    setStatus("Initialization failed: " + err.message);
                    return;
                }

                try {
                    // Create the room in Firestore
                    roomRef = await addDoc(collection(db, 'rooms'), {});
                    const roomId = roomRef.id;
                    setCurrentRoomId(roomId);
                    
                    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
                    peerConnection.onicecandidate = (event) => event.candidate && addDoc(callerCandidatesCollection, event.candidate.toJSON());
                    
                    const offerDescription = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offerDescription);
                    await setDoc(roomRef, { offer: { sdp: offerDescription.sdp, type: offerDescription.type } });
                    setStatus(`Room created. Share the ID: ${roomId}`);

                    // Save room ID to localStorage for persistence
                    localStorage.setItem('lastRoomId', roomId);
                    
                    const unsubAnswer = onSnapshot(roomRef, (snapshot) => {
                        const data = snapshot.data();
                        if (!peerConnection.currentRemoteDescription && data?.answer) {
                            peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                            setStatus('Connection offer accepted.');
                        }
                    });
                    unsubscribes.push(unsubAnswer);
                    
                    const unsubCallee = onSnapshot(collection(roomRef, 'calleeCandidates'), (snap) => snap.docChanges().forEach((change) => change.type === 'added' && peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()))));
                    unsubscribes.push(unsubCallee);
                } catch (error) {
                    console.error("Error creating room:", error);
                    setStatus(`Error creating room: ${error.message}`);
                }
            }
        };

        initRef.current = init;
        init().catch(err => {
            console.error("Initialization failed:", err);
            setStatus(`Error: ${err.message}.`);
        });

        return () => { 
            if (pc.current && pc.current.signalingState !== 'closed') pc.current.close();
            unsubscribes.forEach(unsub => unsub());
            if (localStream) localStream.getTracks().forEach(track => track.stop());
            if (roomRef && !initialRoomId) deleteDoc(roomRef);
            if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
            reconnectAttemptsRef.current = 0;
            setIsReconnecting(false);
            reconnectNowRef.current = null;
            cancelReconnectRef.current = null;
        };
    }, [initialRoomId]);
    
    const handleNotesChange = (e) => {
        const newNotes = e.target.value;
        setSharedNotes(newNotes);
        
        // Save notes to localStorage for offline persistence
        localStorage.setItem('cachedNotes', newNotes);
        
        if (dataChannel.current?.readyState === 'open') {
            dataChannel.current.send(JSON.stringify({ type: 'notes', content: newNotes }));
        }
    };
    
    // Function to handle file sharing with offline support
    const handleFileShare = (file) => {
        if (!file) return;
        
        // Store file in IndexedDB for offline access
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Save file to localStorage for offline access (small files only)
                const arrayBuffer = e.target.result;
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                const base64String = btoa(binary);
                const dataUrl = `data:${file.type};base64,${base64String}`;
                const fileData = { name: file.name, type: file.type, data: dataUrl, timestamp: Date.now() };

                // Store in localStorage (with size limit check)
                if (arrayBuffer.byteLength < 4_500_000) { // ~4.5MB limit
                    try { localStorage.setItem(`file_${file.name}`, JSON.stringify(fileData)); }
                    catch (err) { console.warn('Failed to cache file locally:', err); }
                }
                
                // Send via data channel if connected
                if (dataChannel.current?.readyState === 'open') {
                    // Send file in chunks
                    const chunkSize = 16384;
                    const arrayBuffer = e.target.result;
                    
                    for (let i = 0; i < arrayBuffer.byteLength; i += chunkSize) {
                        const chunk = arrayBuffer.slice(i, i + chunkSize);
                        dataChannel.current.send(JSON.stringify({
                            type: 'file',
                            done: false,
                            value: Array.from(new Uint8Array(chunk))
                        }));
                    }
                    
                    // Send completion message
                    dataChannel.current.send(JSON.stringify({
                        type: 'file',
                        done: true,
                        value: { name: file.name, type: file.type }
                    }));
                }
            } catch (error) {
                console.error("Error processing file:", error);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <button onClick={goHome} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600">&larr; Back to Home</button>
                <div className={`px-4 py-2 rounded-full text-sm font-semibold ${isConnected ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{isConnected ? 'Connected' : 'Connecting...'}</div>
            </div>
             <div className="card p-4 sm:p-8">
                {currentRoomId && (<div className="mb-4"><label className="text-sm text-gray-400">Room ID</label><input type="text" readOnly value={currentRoomId} className="w-full bg-gray-700 p-2 rounded-md text-center text-lg tracking-widest" onClick={e => e.target.select()}/></div>)}
                <p role="status" aria-live="polite" className="text-sm italic text-gray-500 mb-6 text-center">{status}</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><h3 className="font-bold mb-2 text-center text-gray-400">You</h3><VideoStream stream={localStream} muted={true} /></div>
                            <div><h3 className="font-bold mb-2 text-center text-gray-400">Peer</h3><VideoStream stream={remoteStream} /></div>
                        </div>
                        <LessonContentDisplay content={displayedContent} />
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                       <SharedNotes notes={sharedNotes} onNotesChange={handleNotesChange} disabled={!isConnected} cloudSync={cloudSync} userId={userId} roomId={currentRoomId} />
                       <FileShareComponent dataChannel={dataChannel.current} isConnected={isConnected} receivedFiles={receivedFiles} setReceivedFiles={setReceivedFiles} setDisplayedContent={setDisplayedContent} cloudSync={cloudSync} userId={userId} roomId={currentRoomId}/>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LessonContentDisplay({ content }) {
    const [contentUrl, setContentUrl] = useState('');

    useEffect(() => {
        if (content && content.blob && (content.blob.type.startsWith('image/') || content.blob.type.startsWith('video/'))) {
            const url = URL.createObjectURL(content.blob);
            setContentUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setContentUrl('');
    }, [content]);

    const isYouTube = (u) => {
        if (!u) return false;
        return u.includes('youtube.com') || u.includes('youtu.be');
    };
    const toYouTubeEmbed = (u) => {
        try {
            if (u.includes('youtu.be')) {
                const id = u.split('youtu.be/')[1].split(/[?&]/)[0];
                return `https://www.youtube.com/embed/${id}`;
            }
            const url = new URL(u);
            const id = url.searchParams.get('v');
            return `https://www.youtube.com/embed/${id}`;
        } catch (err) { return u; }
    };

    return (
        <div className="card p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Content</h3>
            <div className="bg-black rounded-lg aspect-video flex items-center justify-center p-4">
                {!content ? <p className="text-gray-500">No content selected.</p> :
                    // Support: embedded images (blob), local video files (blob), or URL-based resources
                    (content.blob && content.blob.type && content.blob.type.startsWith('image/')) ? <img src={contentUrl} alt={content.name} className="max-w-full max-h-full object-contain" /> :
                    (content.blob && content.blob.type && content.blob.type.startsWith('video/')) ? <video src={contentUrl} controls className="max-w-full max-h-full" /> :
                    (content.url && isYouTube(content.url)) ? <iframe title={content.name || 'YouTube video'} src={toYouTubeEmbed(content.url)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" /> :
                    (content.url && content.type === 'video/url') ? <video src={content.url} controls className="max-w-full max-h-full" /> :
                    <p className="text-gray-400 text-center">Cannot preview this file type.<br/>Download from the list below.</p>
                }
            </div>
        </div>
    );
}

function SharedNotes({ notes, onNotesChange, disabled, cloudSync, userId, roomId }) {
    const [lastSynced, setLastSynced] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastError, setLastError] = useState(null);
    
    // Save notes to Supabase when they change
    useEffect(() => {
        if (!cloudSync || supabaseIsMock) return; // short-circuit when cloud sync disabled or mocked
        if (cloudSync && roomId && userId && notes) {
            const saveNotesToCloud = async () => {
                try {
                    setIsSaving(true);
                    const { error } = await supabase
                        .from('notes')
                        .upsert(
                            { 
                                room_id: roomId,
                                user_id: userId,
                                content: notes,
                                updated_at: new Date().toISOString()
                            },
                            { onConflict: 'room_id' }
                        );
                        
                    if (error) {
                        console.error('Error saving notes to cloud:', error);
                        setLastError(error.message || String(error));
                    } else {
                        setLastSynced(new Date());
                        setLastError(null);
                    }
                } finally {
                    setIsSaving(false);
                }
            };
            
            // Debounce the save operation
            const timer = setTimeout(saveNotesToCloud, 1000);
            return () => clearTimeout(timer);
        }
    }, [notes, cloudSync, roomId, userId]);
    
    return (
        <div className="card p-4">
            <textarea
                value={notes}
                onChange={onNotesChange}
                disabled={disabled}
                placeholder={disabled ? "Waiting for connection..." : "Type your collaborative notes here..."}
                className="w-full h-64 bg-gray-700 border border-gray-600 rounded-md p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-gray-900 resize-none"
            />
        </div>
    );
}

function FileShareComponent({ dataChannel, isConnected, receivedFiles, setReceivedFiles, setDisplayedContent, cloudSync, userId, roomId }) {
    const CHUNK_SIZE = 64 * 1024; // 64KB for faster transfers
    const [isUploading, setIsUploading] = useState(false);
    const [cloudError, setCloudError] = useState(null);
    const [sharedUrl, setSharedUrl] = useState('');

    // Load files from localStorage and then from Supabase when component mounts
    useEffect(() => {
        // Load cached local files (stored as base64 data URLs under keys 'file_<name>')
        try {
            const cachedFiles = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('file_')) {
                    const raw = localStorage.getItem(key);
                    if (!raw) continue;
                    const stored = JSON.parse(raw);
                    if (stored && stored.data) {
                        try {
                            const dataUrl = stored.data;
                            const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                            const binary = atob(base64);
                            const len = binary.length;
                            const ab = new Uint8Array(len);
                            for (let j = 0; j < len; j++) ab[j] = binary.charCodeAt(j);
                            const blob = new Blob([ab], { type: stored.type });
                            cachedFiles.push({ name: stored.name, blob, type: stored.type });
                        } catch (innerErr) {
                            console.warn('Failed to parse cached file', key, innerErr);
                        }
                    }
                }
            }
            if (cachedFiles.length > 0 && setReceivedFiles) setReceivedFiles(prev => [...cachedFiles, ...prev]);
        } catch (err) {
            console.warn('Error loading cached local files', err);
        }

        // If cloud sync is enabled, load from Supabase too
        if (!cloudSync) return;
        if (cloudSync && roomId && setReceivedFiles) {
            const loadFilesFromCloud = async () => {
                try {
                    const { data, error } = await supabase
                        .from('files')
                        .select('*')
                        .eq('room_id', roomId);

                    if (error) {
                        console.error('Error loading files:', error);
                        setCloudError(error.message || String(error));
                    } else if (data && data.length > 0) {
                        // Convert Supabase files to the format expected by the component
                        const formattedFiles = data.map(file => ({
                            name: file.name,
                            blob: new Blob([]), // Placeholder until we download the actual file
                            type: file.type,
                            id: file.id,
                            storage_path: file.storage_path
                        }));
                        setReceivedFiles(formattedFiles);
                    }
                } catch (err) { console.error('Error fetching files:', err); setCloudError(err.message || String(err)); }
            };

            loadFilesFromCloud();
        }
    }, [cloudSync, roomId, setReceivedFiles]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !isConnected) return;
        
        setIsUploading(true);
        const fileInfo = { name: file.name, type: file.type, size: file.size };
        const arrayBuffer = await file.arrayBuffer();

        // Convert arrayBuffer to base64 data URL for local storage fallback
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const base64String = btoa(binary);
        const dataUrl = `data:${file.type};base64,${base64String}`;
        
        try {
            // Send file chunks to peer
            for (let i = 0; i < arrayBuffer.byteLength; i += CHUNK_SIZE) {
                const chunk = arrayBuffer.slice(i, i + CHUNK_SIZE);
                if (dataChannel && dataChannel.readyState === 'open') {
                    dataChannel.send(JSON.stringify({ type: 'file', value: Array.from(new Uint8Array(chunk)) }));
                } else { 
                    console.log("Data channel not ready for sending chunks");
                    break; 
                }
            }
            if (dataChannel && dataChannel.readyState === 'open') {
                dataChannel.send(JSON.stringify({ type: 'file', done: true, value: fileInfo }));
            }
            
            // Store small files locally (fallback) and then Upload to Supabase if cloud sync is enabled
            // Store dataUrl if small enough
            if (arrayBuffer.byteLength < 4_500_000) {
                try {
                    localStorage.setItem(`file_${file.name}`, JSON.stringify({ name: file.name, type: file.type, data: dataUrl }));
                } catch (err) {
                    console.warn('Failed to cache file locally:', err);
                }
            }

            // Upload to Supabase if cloud sync is enabled
            if (cloudSync && roomId && userId) {
                try {
                    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    
                    // Upload the file to storage
                    const { data: storageData, error: storageError } = await supabase
                        .storage
                        .from('files')
                        .upload(`${roomId}/${fileId}`, file);
                        
                    if (storageError) {
                        console.error('Error uploading file to storage:', storageError);
                        setCloudError(storageError.message || String(storageError));
                        return;
                    }
                    
                    // Save the file metadata to the database
                    const { error: dbError } = await supabase
                        .from('files')
                        .insert({
                            id: fileId,
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            storage_path: `${roomId}/${fileId}`,
                            room_id: roomId,
                            user_id: userId,
                            created_at: new Date().toISOString()
                        });
                        
                    if (dbError) {
                        console.error('Error saving file metadata:', dbError);
                        setCloudError(dbError.message || String(dbError));
                    }
                } catch (err) {
                    console.error('Error in file upload process:', err);
                    setCloudError(err.message || String(err));
                }
            }
            } catch (error) { 
                console.error("Error sending file:", error); 
                setCloudError(error.message || String(error));
            } finally {
            setIsUploading(false);
        }
    };

    const handleShareUrl = async (e) => {
        e.preventDefault();
        const url = (sharedUrl || '').trim();
        if (!url) return;
        try {
            if (dataChannel && dataChannel.readyState === 'open') {
                dataChannel.send(JSON.stringify({ type: 'url', value: { name: url, url } }));
            }

            // Add to local receivedFiles and show
            setReceivedFiles(prev => [{ name: url, url, type: 'video/url' }, ...prev]);
            setDisplayedContent({ name: url, url, type: 'video/url' });

            // Optionally, upload metadata to Supabase if enabled
            if (cloudSync && roomId && userId) {
                try {
                    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const { error: dbError } = await supabase
                        .from('files')
                        .insert({
                            id: fileId,
                            name: url,
                            size: 0,
                            type: 'video/url',
                            storage_path: url, // store URL in storage_path for now
                            room_id: roomId,
                            user_id: userId,
                            created_at: new Date().toISOString()
                        });
                    if (dbError) setCloudError(dbError.message || String(dbError));
                } catch (err) {
                    console.error('Error saving URL to cloud:', err);
                    setCloudError(err.message || String(err));
                }
            }
            setSharedUrl('');
        } catch (err) {
            console.error('Failed to share URL', err);
            setCloudError(err.message || String(err));
        }
    };

    const handleDownload = async (file) => {
        // If the file has a storage path and cloud sync is enabled, try to download from Supabase
        if (file.storage_path && cloudSync) {
            try {
                const { data, error } = await supabase
                    .storage
                    .from('files')
                    .download(file.storage_path);
                    
                if (error) {
                    console.error('Error downloading file from Supabase:', error);
                    setCloudError(error.message || String(error));
                    // Fall back to local blob if available
                    if (file.blob) {
                        saveAs(file.blob, file.name);
                    }
                    return;
                }
                
                saveAs(data, file.name);
            } catch (err) {
                console.error('Error in file download from Supabase:', err);
                // Fall back to local blob
                if (file.blob) {
                    saveAs(file.blob, file.name);
                }
            }
        } else if (file.blob) {
            // Use local blob if available
            saveAs(file.blob, file.name);
        } else if (file.url) {
            // For URL-based resources (YouTube or remote mp4), open in new tab to stream
            window.open(file.url, '_blank', 'noopener');
        }
    };

    return (
        <div className="card p-4">
            <h3 className="text-lg font-semibold mb-3 text-green-400">
                Share & Received Files {cloudSync && <span className="text-xs text-green-400 ml-2">☁️ Cloud Storage</span>}
            </h3>
                <div className="p-4 border-2 border-dashed border-gray-600 rounded-lg text-center mb-6">
                      <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} disabled={!isConnected || isUploading} />
                      <label htmlFor="file-upload" className={`cursor-pointer text-white px-6 py-3 rounded-md font-semibold transition-colors ${isConnected && !isUploading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'}`}>
                          {isUploading ? 'Uploading...' : 'Share File'}
                      </label>
                      <div className="mt-3 flex gap-2 items-center justify-center">
                            <input type="text" placeholder="Paste YouTube or video URL" value={sharedUrl} onChange={(e) => setSharedUrl(e.target.value)} className="w-80 bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                            <button onClick={handleShareUrl} disabled={!isConnected && !cloudSync} className={`px-4 py-2 rounded-md text-white ${isConnected || cloudSync ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-600 cursor-not-allowed'}`}>Share URL</button>
                      </div>
                </div>
            {cloudError && <div className="text-sm text-red-400 mb-3">Cloud error: {cloudError}</div>}
            <div className="space-y-3">
                {receivedFiles.length === 0 ? <p className="text-gray-500">No files received yet.</p> :
                    receivedFiles.map((file, index) => (
                       <div key={index} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                            <div className="flex items-center min-w-0 cursor-pointer" onClick={() => setDisplayedContent(file)}>
                                <span className="truncate">{file.name}</span>
                                {file.storage_path && <span className="ml-1 text-xs text-green-400">☁️</span>}
                            </div>
                            <button onClick={() => handleDownload(file)} className="bg-green-600 text-white px-4 py-1 rounded-md text-sm hover:bg-green-700 ml-4">Download</button>
                       </div>
                    ))
                }
            </div>
        </div>
    );
}

// Export the App component
export default App;