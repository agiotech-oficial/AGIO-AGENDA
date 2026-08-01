import React, { useState, useEffect, useRef } from 'react';

export interface MeetingResource {
  title: string;
  url: string;
  type?: 'document' | 'video' | 'link';
  fileData?: string;
  fileName?: string;
  fileSize?: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  type: 'lecture' | 'course' | 'orientation' | 'meeting';
  scheduledAt: string; // ISO String
  targetAudience: 'all' | 'group' | 'individual';
  targetUserIds?: string[]; // IDs if targetAudience is individual or group
  hostName: string;
  hostId: string;
  status: 'scheduled' | 'live' | 'ended';
  externalLink?: string;
  resources?: MeetingResource[];
  createdAt: string;
}

export interface MeetingChatMessage {
  id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'affiliate';
  text: string;
  timestamp: string;
  isQuestion?: boolean;
  answered?: boolean;
  pinned?: boolean;
}

export interface MeetingParticipant {
  userId: string;
  userName: string;
  userRole: 'admin' | 'affiliate';
  isCameraOn: boolean;
  isMicOn: boolean;
  handRaised: boolean;
  isSpeakingGranted: boolean;
  joinedAt: string;
}

interface VirtualMeetingRoomProps {
  currentUser: any;
  isAdmin: boolean;
  onNavigate: (view: string) => void;
  onOpenSupport?: () => void;
  initialMeetingId?: string;
}

export function VirtualMeetingRoom({ currentUser, isAdmin, onNavigate, onOpenSupport, initialMeetingId }: VirtualMeetingRoomProps) {
  // Navigation & view state
  const [activeTab, setActiveTab] = useState<'meetings_list' | 'live_room'>('meetings_list');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [chatMessages, setChatMessages] = useState<MeetingChatMessage[]>([]);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  
  // Create / Schedule modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'lecture' | 'course' | 'orientation' | 'meeting'>('lecture');
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [newAudience, setNewAudience] = useState<'all' | 'group' | 'individual'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [newExternalLink, setNewExternalLink] = useState('');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [tempResources, setTempResources] = useState<MeetingResource[]>([]);

  // Users list for admin target selection
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Live Room controls
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'chat' | 'participants' | 'resources' | 'qna'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [isQuestionInput, setIsQuestionInput] = useState(false);

  // Presentation & Board
  const [presentationSlide, setPresentationSlide] = useState(1);
  const [totalSlides] = useState(5);
  const [sharedNotes, setSharedNotes] = useState('Bem-vindos à nossa Reunião Virtual de Afiliados! Sinta-se à vontade para enviar perguntas no chat.');

  // Media references
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Video Presentation & Attachment State
  const [activeVideoResource, setActiveVideoResource] = useState<MeetingResource | null>(null);
  const [isVideoModeActive, setIsVideoModeActive] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [videoSourceTab, setVideoSourceTab] = useState<'upload' | 'url' | 'existing'>('upload');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [uploadedVideoData, setUploadedVideoData] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [newResourceType, setNewResourceType] = useState<'document' | 'video' | 'link'>('video');

  const videoStagePlayerRef = useRef<HTMLVideoElement | null>(null);
  const directVideoFileInputRef = useRef<HTMLInputElement | null>(null);
  const modalVideoFileInputRef = useRef<HTMLInputElement | null>(null);
  const scheduleVideoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Safe user fallback
  const safeUser = currentUser || {
    id: 'guest_' + Math.random().toString(36).substring(2, 7),
    name: isAdmin ? 'Administrador (Host)' : 'Afiliado Visitante',
    isAffiliate: true,
  };

  // Load meetings from localStorage
  const loadMeetings = () => {
    try {
      const stored = localStorage.getItem('agenda_virtual_meetings');
      if (stored) {
        setMeetings(JSON.parse(stored));
      } else {
        // Sample default meeting for onboarding
        const defaultMeetings: Meeting[] = [
          {
            id: 'm_welcome',
            title: 'Boas-Vindas & Treinamento Estratégico de Vendas para Afiliados',
            description: 'Palestra ao vivo conduzida pela administração sobre técnicas de conversão, estratégias de indicação e utilização das ferramentas da agenda.',
            type: 'lecture',
            scheduledAt: new Date(Date.now() + 3600000).toISOString(), // 1h from now
            targetAudience: 'all',
            hostName: 'Administrador Principal',
            hostId: 'admin_master',
            status: 'scheduled',
            resources: [
              { title: 'Guia do Afiliado VIP (PDF)', url: 'https://example.com/guia-afiliado.pdf' },
              { title: 'Material Gráfico de Divulgação', url: 'https://example.com/material-grafico' }
            ],
            createdAt: new Date().toISOString(),
          }
        ];
        localStorage.setItem('agenda_virtual_meetings', JSON.stringify(defaultMeetings));
        setMeetings(defaultMeetings);
      }
    } catch (e) {
      console.error("Error loading virtual meetings:", e);
    }
  };

  // Load user list for targeting
  const loadUsers = () => {
    try {
      const stored = localStorage.getItem('agenda_users');
      if (stored) {
        setAllUsers(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading users:", e);
    }
  };

  useEffect(() => {
    loadMeetings();
    loadUsers();

    // BroadcastChannel for cross-tab real-time sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('agenda_virtual_meeting_channel');
      broadcastChannelRef.current = bc;

      bc.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'MEETING_UPDATED') {
          loadMeetings();
        } else if (type === 'CHAT_MESSAGE_ADDED') {
          if (payload.meetingId) {
            loadChatMessages(payload.meetingId);
          }
        } else if (type === 'PARTICIPANT_CHANGE') {
          if (payload.meetingId) {
            syncParticipants(payload.meetingId);
          }
        } else if (type === 'PRESENTATION_CHANGE') {
          if (payload.slide !== undefined) setPresentationSlide(payload.slide);
          if (payload.notes !== undefined) setSharedNotes(payload.notes);
        } else if (type === 'VIDEO_PRESENTATION_CHANGE') {
          if (payload.activeVideoResource !== undefined) setActiveVideoResource(payload.activeVideoResource);
          if (payload.isVideoModeActive !== undefined) setIsVideoModeActive(payload.isVideoModeActive);
        }
      };
    }

    // Storage event listener fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agenda_virtual_meetings') {
        loadMeetings();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      stopMediaStream();
    };
  }, []);

  // Handle initial meeting if passed
  useEffect(() => {
    if (initialMeetingId && meetings.length > 0) {
      const found = meetings.find(m => m.id === initialMeetingId);
      if (found) {
        handleJoinMeeting(found);
      }
    }
  }, [initialMeetingId, meetings]);

  // Load chat messages for active meeting
  const loadChatMessages = (meetingId: string) => {
    try {
      const stored = localStorage.getItem(`agenda_meeting_chat_${meetingId}`);
      if (stored) {
        setChatMessages(JSON.parse(stored));
      } else {
        setChatMessages([]);
      }
    } catch (e) {
      console.error("Error loading chat:", e);
    }
  };

  // Sync participants for active meeting
  const syncParticipants = (meetingId: string) => {
    try {
      const stored = localStorage.getItem(`agenda_meeting_participants_${meetingId}`);
      if (stored) {
        setParticipants(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error syncing participants:", e);
    }
  };

  // Broadcast helper
  const notifyBroadcast = (type: string, payload: any) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type, payload });
    }
  };

  // Save meetings helper
  const saveMeetings = (updated: Meeting[]) => {
    setMeetings(updated);
    localStorage.setItem('agenda_virtual_meetings', JSON.stringify(updated));
    notifyBroadcast('MEETING_UPDATED', {});
  };

  // Start media stream (Webcam & Mic)
  const startMediaStream = async (video: boolean, audio: boolean) => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: audio,
        });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsCameraOn(video);
        setIsMicOn(audio);
      }
    } catch (err) {
      console.warn("MediaDevices access restricted or unavailable:", err);
      // Soft fallback - simulate studio broadcast preview
      setIsCameraOn(video);
      setIsMicOn(audio);
    }
  };

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOn(false);
    setIsMicOn(false);
    setIsScreenSharing(false);
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !isMicOn;
        setIsMicOn(!isMicOn);
        return;
      }
    }
    setIsMicOn(!isMicOn);
  };

  const toggleCamera = () => {
    if (isCameraOn) {
      stopMediaStream();
    } else {
      startMediaStream(true, isMicOn);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setIsScreenSharing(true);
        } else {
          setIsScreenSharing(true);
        }
      } catch (e) {
        console.warn("Screen share cancelled or unpermitted", e);
        setIsScreenSharing(true);
      }
    } else {
      setIsScreenSharing(false);
      if (isCameraOn) {
        startMediaStream(true, isMicOn);
      }
    }
  };

  // Schedule a new meeting
  const handleScheduleMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Por favor, informe o título da palestra ou reunião.');
      return;
    }

    const scheduledIso = newScheduledDate && newScheduledTime
      ? new Date(`${newScheduledDate}T${newScheduledTime}`).toISOString()
      : new Date().toISOString();

    const meeting: Meeting = {
      id: 'm_' + Date.now().toString(36),
      title: newTitle.trim(),
      description: newDescription.trim(),
      type: newType,
      scheduledAt: scheduledIso,
      targetAudience: newAudience,
      targetUserIds: newAudience !== 'all' ? selectedUserIds : undefined,
      hostName: safeUser.name || 'Administrador',
      hostId: safeUser.id || 'admin',
      status: 'scheduled',
      externalLink: newExternalLink.trim() || undefined,
      resources: tempResources.length > 0 ? tempResources : undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [meeting, ...meetings];
    saveMeetings(updated);

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewType('lecture');
    setNewScheduledDate('');
    setNewScheduledTime('');
    setNewAudience('all');
    setSelectedUserIds([]);
    setNewExternalLink('');
    setTempResources([]);
    setIsScheduleModalOpen(false);

    alert('Reunião / Palestra agendada com sucesso!');
  };

  const addResourceToTemp = () => {
    if (!newResourceTitle.trim() || !newResourceUrl.trim()) return;
    setTempResources([
      ...tempResources,
      {
        title: newResourceTitle.trim(),
        url: newResourceUrl.trim(),
        type: newResourceType,
        fileData: uploadedVideoData || undefined,
        fileName: uploadedFileName || undefined,
        fileSize: uploadedFileSize || undefined,
      }
    ]);
    setNewResourceTitle('');
    setNewResourceUrl('');
    setUploadedVideoData(null);
    setUploadedFileName('');
    setUploadedFileSize('');
  };

  // Add resource directly to currently active meeting
  const addResourceToCurrentMeeting = (res: MeetingResource) => {
    if (!currentMeeting) return;
    const currentRes = currentMeeting.resources || [];
    const updatedRes = [...currentRes, res];
    const updatedMeeting = { ...currentMeeting, resources: updatedRes };
    setCurrentMeeting(updatedMeeting);

    const updatedMeetings = meetings.map(m => m.id === currentMeeting.id ? updatedMeeting : m);
    saveMeetings(updatedMeetings);
  };

  // Handle video file upload from local device
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'modal' | 'schedule' | 'direct') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      alert('Aviso: O arquivo de vídeo tem tamanho superior a 100MB. Para uma reprodução mais fluida, vídeos otimizados são recomendados.');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
      const formattedSize = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

      if (target === 'modal') {
        setUploadedVideoData(dataUrl);
        setUploadedFileName(file.name);
        setUploadedFileSize(formattedSize);
        if (!newVideoTitle) setNewVideoTitle(cleanTitle);
      } else if (target === 'schedule') {
        setUploadedVideoData(dataUrl);
        setUploadedFileName(file.name);
        setUploadedFileSize(formattedSize);
        setNewResourceType('video');
        if (!newResourceTitle) setNewResourceTitle(cleanTitle);
        setNewResourceUrl(dataUrl);
      } else if (target === 'direct') {
        const videoRes: MeetingResource = {
          title: cleanTitle,
          url: dataUrl,
          type: 'video',
          fileData: dataUrl,
          fileName: file.name,
          fileSize: formattedSize,
        };
        addResourceToCurrentMeeting(videoRes);
        handleStartVideoPresentation(videoRes);
      }
    };
    reader.readAsDataURL(file);
  };

  // Start video presentation on stage
  const handleStartVideoPresentation = (res: MeetingResource) => {
    setActiveVideoResource(res);
    setIsVideoModeActive(true);
    setIsCameraOn(false);
    setIsScreenSharing(false);
    notifyBroadcast('VIDEO_PRESENTATION_CHANGE', {
      activeVideoResource: res,
      isVideoModeActive: true,
    });
  };

  // Stop video presentation on stage
  const handleStopVideoPresentation = () => {
    setActiveVideoResource(null);
    setIsVideoModeActive(false);
    notifyBroadcast('VIDEO_PRESENTATION_CHANGE', {
      activeVideoResource: null,
      isVideoModeActive: false,
    });
  };

  // Submit modal form for attaching/presenting video
  const handleAttachAndPresentVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = uploadedVideoData || newVideoUrl.trim();
    if (!finalUrl) {
      alert('Por favor, selecione um arquivo de vídeo ou informe o link da URL.');
      return;
    }

    const title = newVideoTitle.trim() || uploadedFileName || 'Vídeo de Apresentação';
    const newVideoRes: MeetingResource = {
      title,
      url: finalUrl,
      type: 'video',
      fileData: uploadedVideoData || undefined,
      fileName: uploadedFileName || undefined,
      fileSize: uploadedFileSize || undefined,
    };

    if (currentMeeting) {
      addResourceToCurrentMeeting(newVideoRes);
    }

    handleStartVideoPresentation(newVideoRes);

    // Reset modal
    setNewVideoTitle('');
    setNewVideoUrl('');
    setUploadedVideoData(null);
    setUploadedFileName('');
    setUploadedFileSize('');
    setIsVideoModalOpen(false);
  };

  // Start Meeting (Host / Admin)
  const handleStartLive = (meeting: Meeting) => {
    const updated = meetings.map(m => m.id === meeting.id ? { ...m, status: 'live' as const } : m);
    saveMeetings(updated);
    handleJoinMeeting({ ...meeting, status: 'live' });
  };

  // End Meeting (Host / Admin)
  const handleEndLive = (meetingId: string) => {
    if (window.confirm('Tem certeza que deseja encerrar esta reunião ao vivo?')) {
      const updated = meetings.map(m => m.id === meetingId ? { ...m, status: 'ended' as const } : m);
      saveMeetings(updated);
      stopMediaStream();
      setActiveTab('meetings_list');
      setCurrentMeeting(null);
    }
  };

  // Join Meeting (Admin or Affiliate)
  const handleJoinMeeting = (meeting: Meeting) => {
    setCurrentMeeting(meeting);
    setActiveTab('live_room');
    loadChatMessages(meeting.id);

    // Register participant
    const currentParts: MeetingParticipant[] = JSON.parse(localStorage.getItem(`agenda_meeting_participants_${meeting.id}`) || '[]');
    const existingIndex = currentParts.findIndex(p => p.userId === safeUser.id);

    const me: MeetingParticipant = {
      userId: safeUser.id,
      userName: safeUser.name,
      userRole: isAdmin ? 'admin' : 'affiliate',
      isCameraOn: isAdmin,
      isMicOn: isAdmin,
      handRaised: false,
      isSpeakingGranted: isAdmin,
      joinedAt: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      currentParts[existingIndex] = me;
    } else {
      currentParts.push(me);
    }

    localStorage.setItem(`agenda_meeting_participants_${meeting.id}`, JSON.stringify(currentParts));
    setParticipants(currentParts);
    notifyBroadcast('PARTICIPANT_CHANGE', { meetingId: meeting.id });

    // Enable host camera/mic preview automatically if admin
    if (isAdmin) {
      startMediaStream(true, true);
    }
  };

  // Leave Room
  const handleLeaveRoom = () => {
    if (currentMeeting) {
      const currentParts: MeetingParticipant[] = JSON.parse(localStorage.getItem(`agenda_meeting_participants_${currentMeeting.id}`) || '[]');
      const filtered = currentParts.filter(p => p.userId !== safeUser.id);
      localStorage.setItem(`agenda_meeting_participants_${currentMeeting.id}`, JSON.stringify(filtered));
      notifyBroadcast('PARTICIPANT_CHANGE', { meetingId: currentMeeting.id });
    }
    stopMediaStream();
    setActiveTab('meetings_list');
    setCurrentMeeting(null);
  };

  // Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentMeeting) return;

    const msg: MeetingChatMessage = {
      id: 'msg_' + Date.now().toString(36),
      meetingId: currentMeeting.id,
      senderId: safeUser.id,
      senderName: safeUser.name,
      senderRole: isAdmin ? 'admin' : 'affiliate',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isQuestion: isQuestionInput,
      answered: false,
    };

    const updated = [...chatMessages, msg];
    setChatMessages(updated);
    localStorage.setItem(`agenda_meeting_chat_${currentMeeting.id}`, JSON.stringify(updated));
    notifyBroadcast('CHAT_MESSAGE_ADDED', { meetingId: currentMeeting.id });

    setChatInput('');
    setIsQuestionInput(false);
  };

  // Toggle Hand Raise
  const handleToggleHandRaise = () => {
    if (!currentMeeting) return;
    const newHandState = !handRaised;
    setHandRaised(newHandState);

    const currentParts: MeetingParticipant[] = JSON.parse(localStorage.getItem(`agenda_meeting_participants_${currentMeeting.id}`) || '[]');
    const updated = currentParts.map(p => p.userId === safeUser.id ? { ...p, handRaised: newHandState } : p);
    localStorage.setItem(`agenda_meeting_participants_${currentMeeting.id}`, JSON.stringify(updated));
    setParticipants(updated);
    notifyBroadcast('PARTICIPANT_CHANGE', { meetingId: currentMeeting.id });
  };

  // Admin actions on participants
  const handleGrantSpeaking = (participantId: string, grant: boolean) => {
    if (!currentMeeting || !isAdmin) return;
    const currentParts: MeetingParticipant[] = JSON.parse(localStorage.getItem(`agenda_meeting_participants_${currentMeeting.id}`) || '[]');
    const updated = currentParts.map(p => p.userId === participantId ? { ...p, isSpeakingGranted: grant, handRaised: grant ? false : p.handRaised } : p);
    localStorage.setItem(`agenda_meeting_participants_${currentMeeting.id}`, JSON.stringify(updated));
    setParticipants(updated);
    notifyBroadcast('PARTICIPANT_CHANGE', { meetingId: currentMeeting.id });
  };

  // Slide navigation
  const handleSlideChange = (slide: number) => {
    setPresentationSlide(slide);
    notifyBroadcast('PRESENTATION_CHANGE', { slide });
  };

  // Delete meeting
  const handleDeleteMeeting = (meetingId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento de reunião?')) {
      const updated = meetings.filter(m => m.id !== meetingId);
      saveMeetings(updated);
    }
  };

  // Filter visible meetings for affiliate
  const visibleMeetings = meetings.filter(m => {
    if (isAdmin) return true;
    if (m.targetAudience === 'all') return true;
    if (m.targetAudience === 'group' || m.targetAudience === 'individual') {
      return m.targetUserIds && m.targetUserIds.includes(safeUser.id);
    }
    return true;
  });

  const liveMeetings = visibleMeetings.filter(m => m.status === 'live');
  const scheduledMeetings = visibleMeetings.filter(m => m.status === 'scheduled');
  const pastMeetings = visibleMeetings.filter(m => m.status === 'ended');

  return (
    <div className="min-h-screen bg-[#071d18] text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#061814]/90 backdrop-blur-md border-b border-emerald-500/20 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('main_menu')}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white/80 hover:text-white cursor-pointer"
            title="Voltar ao Menu Principal"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <span className="material-symbols-outlined text-[24px]">videocam</span>
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                Sala de Reuniões Virtual
                {liveMeetings.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Ao Vivo ({liveMeetings.length})
                  </span>
                )}
              </h1>
              <p className="text-xs text-emerald-200/70 font-medium">
                {isAdmin ? 'Painel de Transmissão & Cursos (Administrador)' : 'Aulas, Treinamentos & Mentorias em Grupo'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Agendar Reunião / Palestra</span>
            </button>
          )}

          {activeTab === 'live_room' && (
            <button
              onClick={handleLeaveRoom}
              className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sair da Sala</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* LIST VIEW */}
        {activeTab === 'meetings_list' && (
          <div className="flex flex-col gap-6">
            {/* Live Banner Section if any */}
            {liveMeetings.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-2 border-emerald-400/50 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-5 animate-in fade-in duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-start gap-4 z-10">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 shadow-lg animate-pulse">
                    <span className="material-symbols-outlined text-[32px]">sensors</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        Transmissão Ao Vivo Agora
                      </span>
                      <span className="text-xs text-emerald-200/80 font-medium">Ministrado por {liveMeetings[0].hostName}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">{liveMeetings[0].title}</h2>
                    <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl line-clamp-2">{liveMeetings[0].description}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0 z-10">
                  <button
                    onClick={() => handleJoinMeeting(liveMeetings[0])}
                    className="w-full sm:w-auto bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">login</span>
                    Entrar na Sala Virtual
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleEndLive(liveMeetings[0].id)}
                      className="w-full sm:w-auto bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-bold text-xs px-4 py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                      Encerrar Live
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Overview Hero Header */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">groups</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Salas de Reunião, Orientação & Mentorias</h3>
                  <p className="text-xs text-white/70">
                    Acompanhe palestras exclusivas, tire suas dúvidas ao vivo com a equipe e aprimore suas vendas como afiliado.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-2 rounded-xl">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>{scheduledMeetings.length} Reunião(ões) Agendada(s)</span>
              </div>
            </div>

            {/* Scheduled Meetings */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                Próximas Palestras e Reuniões Agendadas
              </h3>

              {scheduledMeetings.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                    <span className="material-symbols-outlined text-[32px]">event_busy</span>
                  </div>
                  <p className="text-sm font-medium text-white/70">Nenhuma reunião ou palestra agendada no momento.</p>
                  {isAdmin && (
                    <button
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                    >
                      + Clique aqui para agendar uma palestra ou curso
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scheduledMeetings.map(meeting => {
                    const scheduledDate = new Date(meeting.scheduledAt);
                    const isToday = new Date().toDateString() === scheduledDate.toDateString();

                    return (
                      <div
                        key={meeting.id}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              meeting.type === 'lecture' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                              meeting.type === 'course' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                              meeting.type === 'orientation' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {meeting.type === 'lecture' ? '🎤 Palestra' :
                               meeting.type === 'course' ? '📚 Curso' :
                               meeting.type === 'orientation' ? '💡 Orientação' : '🤝 Reunião'}
                            </span>

                            <span className={`text-xs font-bold ${isToday ? 'text-emerald-400 font-extrabold' : 'text-white/70'}`}>
                              {isToday ? 'HOJE' : scheduledDate.toLocaleDateString()} às {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {meeting.title}
                          </h4>
                          <p className="text-xs text-white/70 mt-1.5 leading-relaxed line-clamp-3">
                            {meeting.description}
                          </p>

                          {meeting.resources && meeting.resources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                              {meeting.resources.map((res, idx) => (
                                <a
                                  key={idx}
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] bg-white/10 hover:bg-white/20 text-white/90 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[14px]">attachment</span>
                                  <span>{res.title}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-white/50">
                            Host: {meeting.hostName}
                          </span>

                          <div className="flex items-center gap-2">
                            {isAdmin ? (
                              <>
                                <button
                                  onClick={() => handleStartLive(meeting)}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">sensors</span>
                                  <span>Iniciar Transmissão</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteMeeting(meeting.id)}
                                  className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleJoinMeeting(meeting)}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">door_open</span>
                                <span>Acessar Sala</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Meetings */}
            {pastMeetings.length > 0 && (
              <div className="flex flex-col gap-3 mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  Reuniões Encerradas
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10">
                  {pastMeetings.map(meeting => (
                    <div key={meeting.id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h5 className="text-sm font-bold text-white/80">{meeting.title}</h5>
                        <p className="text-xs text-white/50">{meeting.description}</p>
                      </div>
                      <span className="text-xs text-white/40 shrink-0">
                        Encerrada
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LIVE ROOM VIEW */}
        {activeTab === 'live_room' && currentMeeting && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
            {/* Main Stage (3 cols on large screen) */}
            <div className="lg:col-span-3 flex flex-col gap-3">
              {/* Top Room Header Bar */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {currentMeeting.status === 'live' ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        AO VIVO
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        SALA DE AGUARDO
                      </span>
                    )}
                    <h2 className="text-base font-extrabold text-white">{currentMeeting.title}</h2>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">Apresentador: {currentMeeting.hostName}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    {participants.length} Participante(s)
                  </span>
                </div>
              </div>

              {/* Screen / Video Player Box */}
              <div className="relative bg-black border border-emerald-500/30 rounded-2xl overflow-hidden aspect-video flex items-center justify-center shadow-2xl group">
                {/* 1. PRESENTATION OF ATTACHED VIDEO MATERIAL */}
                {isVideoModeActive && activeVideoResource ? (
                  <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden">
                    {/* Header Overlay for Active Video */}
                    <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 flex items-center justify-between text-xs text-white">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <span className="material-symbols-outlined text-[14px]">movie</span>
                          Apresentação de Vídeo
                        </span>
                        <span className="font-bold text-white truncate max-w-xs">{activeVideoResource.title}</span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={handleStopVideoPresentation}
                          className="bg-rose-500/80 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-md"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                          Encerrar Exibição de Vídeo
                        </button>
                      )}
                    </div>

                    {/* Video Player */}
                    <video
                      ref={videoStagePlayerRef}
                      src={activeVideoResource.fileData || activeVideoResource.url}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain max-h-[500px]"
                    />
                  </div>
                ) : (
                  <>
                    {/* 2. Embedded Video / Webcam Feed */}
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted={isAdmin} // Mute local preview if host to prevent feedback
                      className={`w-full h-full object-cover ${isCameraOn || isScreenSharing ? 'block' : 'hidden'}`}
                    />

                    {/* 3. Simulated Presentation Slide if camera/screenshare off */}
                    {(!isCameraOn && !isScreenSharing) && (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 p-6 flex flex-col justify-between items-center text-center">
                        <div className="w-full flex items-center justify-between text-xs text-white/60 border-b border-white/10 pb-3">
                          <span className="flex items-center gap-1 text-emerald-400 font-bold">
                            <span className="material-symbols-outlined text-[16px]">slideshow</span>
                            Apresentação de Treinamento
                          </span>
                          <span>Slide {presentationSlide} de {totalSlides}</span>
                        </div>

                        <div className="my-auto max-w-xl flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-[36px]">school</span>
                          </div>
                          <h3 className="text-xl font-black text-white">{currentMeeting.title}</h3>
                          <div className="bg-white/10 border border-white/15 p-4 rounded-xl text-xs text-white/90 text-left w-full shadow-inner leading-relaxed">
                            <p className="font-bold text-emerald-300 mb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">edit_note</span>
                              Anotações da Reunião / Conteúdo:
                            </p>
                            <p>{sharedNotes}</p>
                          </div>
                        </div>

                        {/* Admin Slide Controls */}
                        {isAdmin && (
                          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                            <button
                              onClick={() => handleSlideChange(Math.max(1, presentationSlide - 1))}
                              className="p-1 hover:bg-white/20 rounded-lg text-white"
                            >
                              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <span className="text-xs font-bold text-white">Slide {presentationSlide} / {totalSlides}</span>
                            <button
                              onClick={() => handleSlideChange(Math.min(totalSlides, presentationSlide + 1))}
                              className="p-1 hover:bg-white/20 rounded-lg text-white"
                            >
                              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Hand Raise Badge Alert for Admin */}
                {isAdmin && participants.some(p => p.handRaised) && (
                  <div className="absolute top-4 left-4 bg-amber-500 text-black px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-lg flex items-center gap-1.5 animate-bounce z-30">
                    <span className="material-symbols-outlined text-[18px]">front_hand</span>
                    <span>{participants.filter(p => p.handRaised).length} Afiliado(s) pedindo a palavra!</span>
                  </div>
                )}
              </div>

              {/* Media Controls Bar */}
              <div className="bg-[#061814] border border-emerald-500/30 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMic}
                    className={`p-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      isMicOn
                        ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isMicOn ? 'mic' : 'mic_off'}
                    </span>
                    <span className="hidden sm:inline">{isMicOn ? 'Microfone On' : 'Microfone Mutado'}</span>
                  </button>

                  <button
                    onClick={toggleCamera}
                    className={`p-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      isCameraOn
                        ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                        : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isCameraOn ? 'videocam' : 'videocam_off'}
                    </span>
                    <span className="hidden sm:inline">{isCameraOn ? 'Câmera Ativa' : 'Câmera Desligada'}</span>
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={toggleScreenShare}
                        className={`p-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isScreenSharing
                            ? 'bg-teal-400 text-black font-extrabold shadow-md'
                            : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">screen_share</span>
                        <span className="hidden sm:inline">{isScreenSharing ? 'Compartilhando' : 'Compartilhar Tela'}</span>
                      </button>

                      {/* Video Material Attachment & Presentation Control */}
                      <button
                        onClick={() => setIsVideoModalOpen(true)}
                        className={`p-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isVideoModeActive
                            ? 'bg-amber-400 text-black font-extrabold shadow-lg shadow-amber-500/20 border border-amber-300 animate-pulse'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/80'
                        }`}
                        title="Anexar e Apresentar Vídeo em Arquivo no Palco"
                      >
                        <span className="material-symbols-outlined text-[20px]">movie</span>
                        <span className="hidden sm:inline">
                          {isVideoModeActive ? 'Vídeo no Palco' : 'Anexar / Apresentar Vídeo'}
                        </span>
                        {isVideoModeActive && (
                          <span className="w-2 h-2 rounded-full bg-black animate-ping"></span>
                        )}
                      </button>

                      <input
                        type="file"
                        ref={directVideoFileInputRef}
                        accept="video/*"
                        onChange={(e) => handleVideoFileUpload(e, 'direct')}
                        className="hidden"
                      />
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isAdmin && (
                    <button
                      onClick={handleToggleHandRaise}
                      className={`p-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        handRaised
                          ? 'bg-amber-400 text-black font-extrabold shadow-md animate-pulse'
                          : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">front_hand</span>
                      <span>{handRaised ? 'Mão Levantada!' : 'Levantar a Mão'}</span>
                    </button>
                  )}

                  <button
                    onClick={handleLeaveRoom}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-3 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">call_end</span>
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar (Chat, Participants, Resources) */}
            <div className="bg-[#061814] border border-emerald-500/30 rounded-2xl flex flex-col h-[550px] lg:h-auto overflow-hidden shadow-xl">
              {/* Sidebar Tabs */}
              <div className="bg-white/5 border-b border-white/10 p-2 flex items-center justify-around gap-1">
                <button
                  onClick={() => setActiveSidePanel('chat')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeSidePanel === 'chat'
                      ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>Chat</span>
                </button>

                <button
                  onClick={() => setActiveSidePanel('participants')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeSidePanel === 'participants'
                      ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  <span>Pessoas ({participants.length})</span>
                </button>

                <button
                  onClick={() => setActiveSidePanel('resources')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeSidePanel === 'resources'
                      ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">folder</span>
                  <span>Materiais</span>
                </button>
              </div>

              {/* TAB PANEL: CHAT */}
              {activeSidePanel === 'chat' && (
                <div className="flex-1 flex flex-col justify-between p-3 min-h-0">
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-white/40 p-4">
                        <span className="material-symbols-outlined text-[32px] mb-1">forum</span>
                        <p>Nenhuma mensagem enviada ainda. Faça uma pergunta ou comente no chat!</p>
                      </div>
                    ) : (
                      chatMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                            msg.senderRole === 'admin'
                              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-100'
                              : msg.isQuestion
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-100'
                              : 'bg-white/5 border-white/10 text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span className="flex items-center gap-1">
                              {msg.senderName}
                              {msg.senderRole === 'admin' && (
                                <span className="bg-emerald-400 text-black text-[9px] font-black px-1.5 rounded">HOST</span>
                              )}
                              {msg.isQuestion && (
                                <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 rounded flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[10px]">help</span>
                                  PERGUNTA
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-white/40">{msg.timestamp}</span>
                          </div>
                          <p className="leading-relaxed break-words">{msg.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px] font-bold text-amber-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isQuestionInput}
                          onChange={e => setIsQuestionInput(e.target.checked)}
                          className="rounded border-amber-400 bg-black text-amber-400 focus:ring-amber-400"
                        />
                        <span>Marcar como Pergunta</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="submit"
                        className="bg-emerald-500 hover:bg-emerald-400 text-black p-2 rounded-xl transition-all font-bold cursor-pointer shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">send</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB PANEL: PARTICIPANTS */}
              {activeSidePanel === 'participants' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                  {participants.map(p => (
                    <div
                      key={p.userId}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center font-extrabold text-xs">
                          {p.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white flex items-center gap-1">
                            {p.userName}
                            {p.userRole === 'admin' && (
                              <span className="text-[9px] bg-emerald-400 text-black px-1.5 rounded font-black">HOST</span>
                            )}
                          </p>
                          <p className="text-[10px] text-white/50">
                            {p.handRaised ? '✋ Pediu a palavra' : p.isSpeakingGranted ? '🎙️ Permissão de voz concedida' : 'Ouvinte'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {p.handRaised && (
                          <span className="material-symbols-outlined text-[18px] text-amber-400 animate-bounce" title="Mão Levantada">
                            front_hand
                          </span>
                        )}
                        {isAdmin && p.userRole !== 'admin' && (
                          <button
                            onClick={() => handleGrantSpeaking(p.userId, !p.isSpeakingGranted)}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                              p.isSpeakingGranted ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {p.isSpeakingGranted ? 'Revogar Voz' : 'Liberar Voz'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB PANEL: RESOURCES */}
              {activeSidePanel === 'resources' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">Materiais de Apoio & Vídeos</h5>
                    {isAdmin && (
                      <button
                        onClick={() => setIsVideoModalOpen(true)}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">movie</span>
                        + Anexar Vídeo
                      </button>
                    )}
                  </div>

                  {currentMeeting.resources && currentMeeting.resources.length > 0 ? (
                    <div className="space-y-2">
                      {currentMeeting.resources.map((res, i) => {
                        const isVideo = res.type === 'video' || (res.url && res.url.match(/\.(mp4|webm|mkv|mov)(\?.*)?$/i)) || res.fileData;
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2 text-white transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isVideo
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                  <span className="material-symbols-outlined text-[18px]">
                                    {isVideo ? 'movie' : 'description'}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-white text-xs">{res.title}</span>
                                    {isVideo && (
                                      <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                                        Vídeo {res.fileSize ? `(${res.fileSize})` : ''}
                                      </span>
                                    )}
                                  </div>
                                  {res.fileName && (
                                    <p className="text-[10px] text-white/50">{res.fileName}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                              {isVideo ? (
                                <button
                                  onClick={() => handleStartVideoPresentation(res)}
                                  className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                >
                                  <span className="material-symbols-outlined text-[16px]">play_circle</span>
                                  <span>{isAdmin ? 'Transmitir no Palco' : 'Assistir no Palco'}</span>
                                </button>
                              ) : (
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <span className="material-symbols-outlined text-[16px]">download</span>
                                  <span>Baixar Material</span>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-white/50 text-center py-6 flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[28px] text-white/30">movie_off</span>
                      <p>Nenhum material complementar ou vídeo anexado a esta reunião.</p>
                      {isAdmin && (
                        <button
                          onClick={() => setIsVideoModalOpen(true)}
                          className="mt-2 text-emerald-400 font-bold underline hover:text-emerald-300"
                        >
                          Anexar o primeiro arquivo de vídeo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* SCHEDULE MEETING MODAL (ADMIN ONLY) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#08261f] border border-emerald-500/40 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-emerald-300">
                <span className="material-symbols-outlined text-[24px]">video_call</span>
                <h3 className="font-black text-lg">Agendar Reunião ou Palestra</h3>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block font-bold text-white/90 mb-1">Título da Palestra / Reunião *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: Treinamento VIP de Vendas & Comissões"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block font-bold text-white/90 mb-1">Descrição / Pauta</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Explique o objetivo da transmissão e o que os afiliados vão aprender..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/90 mb-1">Tipo de Evento</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full bg-[#061814] border border-white/20 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="lecture">🎤 Palestra Ao Vivo</option>
                    <option value="course">📚 Curso / Mentoria</option>
                    <option value="orientation">💡 Orientação Geral</option>
                    <option value="meeting">🤝 Reunião Individual/Grupo</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-white/90 mb-1">Público Alvo</label>
                  <select
                    value={newAudience}
                    onChange={e => setNewAudience(e.target.value as any)}
                    className="w-full bg-[#061814] border border-white/20 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="all">Todos os Afiliados</option>
                    <option value="individual">Afiliado(s) Especifico(s)</option>
                  </select>
                </div>
              </div>

              {/* Target User Selector if individual */}
              {newAudience === 'individual' && (
                <div>
                  <label className="block font-bold text-white/90 mb-1">Selecione os Afiliados Convidados</label>
                  <div className="max-h-32 overflow-y-auto bg-black/40 border border-white/20 rounded-xl p-2 space-y-1">
                    {allUsers.length === 0 ? (
                      <p className="text-white/50 text-[11px]">Nenhum usuário cadastrado.</p>
                    ) : (
                      allUsers.map(u => (
                        <label key={u.id} className="flex items-center gap-2 text-white/90 cursor-pointer hover:bg-white/5 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedUserIds([...selectedUserIds, u.id]);
                              } else {
                                setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                              }
                            }}
                            className="rounded border-emerald-400 bg-black text-emerald-400"
                          />
                          <span>{u.name} ({u.email || u.whatsapp || u.id})</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/90 mb-1">Data do Evento</label>
                  <input
                    type="date"
                    value={newScheduledDate}
                    onChange={e => setNewScheduledDate(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/90 mb-1">Horário</label>
                  <input
                    type="time"
                    value={newScheduledTime}
                    onChange={e => setNewScheduledTime(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Attach resources */}
              <div>
                <label className="block font-bold text-white/90 mb-1">Anexar Materiais, Documentos ou Vídeos (Opcional)</label>
                
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={newResourceType}
                    onChange={(e) => setNewResourceType(e.target.value as any)}
                    className="bg-[#061814] border border-white/20 rounded-xl px-2.5 py-1.5 text-white text-xs"
                  >
                    <option value="video">🎬 Vídeo MP4/WebM</option>
                    <option value="document">📄 Documento PDF</option>
                    <option value="link">🔗 Link Externo</option>
                  </select>

                  {newResourceType === 'video' && (
                    <button
                      type="button"
                      onClick={() => scheduleVideoFileInputRef.current?.click()}
                      className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      Subir Vídeo
                    </button>
                  )}
                  <input
                    type="file"
                    ref={scheduleVideoFileInputRef}
                    accept="video/*"
                    onChange={(e) => handleVideoFileUpload(e, 'schedule')}
                    className="hidden"
                  />
                </div>

                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newResourceTitle}
                    onChange={e => setNewResourceTitle(e.target.value)}
                    placeholder="Título do material ou vídeo"
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white text-xs placeholder-white/40"
                  />
                  <input
                    type="text"
                    value={newResourceUrl}
                    onChange={e => setNewResourceUrl(e.target.value)}
                    placeholder={newResourceType === 'video' ? 'URL do vídeo ou arquivo' : 'https://...'}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white text-xs placeholder-white/40"
                  />
                  <button
                    type="button"
                    onClick={addResourceToTemp}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded-xl text-xs font-bold shrink-0"
                  >
                    + Add
                  </button>
                </div>

                {uploadedFileName && (
                  <div className="bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs p-2 rounded-xl mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[16px]">movie</span>
                      {uploadedFileName} ({uploadedFileSize})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedVideoData(null);
                        setUploadedFileName('');
                        setUploadedFileSize('');
                        setNewResourceUrl('');
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                )}

                {tempResources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tempResources.map((res, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold border ${
                          res.type === 'video'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[12px]">
                          {res.type === 'video' ? 'movie' : 'description'}
                        </span>
                        {res.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-5 py-2.5 rounded-xl shadow-lg transition-all"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FOR ATTACHING & PRESENTING VIDEO MATERIALS */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#08261f] border border-emerald-500/40 rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto p-6 flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-300">
                <span className="material-symbols-outlined text-[24px]">movie</span>
                <h3 className="font-black text-lg">Anexar & Apresentar Vídeo no Palco</h3>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Video Source Tabs */}
            <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setVideoSourceTab('upload')}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  videoSourceTab === 'upload'
                    ? 'bg-amber-400 text-black font-black shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">upload</span>
                Subir Arquivo MP4
              </button>

              <button
                type="button"
                onClick={() => setVideoSourceTab('url')}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  videoSourceTab === 'url'
                    ? 'bg-amber-400 text-black font-black shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">link</span>
                Link / URL Directa
              </button>

              {currentMeeting?.resources && currentMeeting.resources.some(r => r.type === 'video' || r.fileData) && (
                <button
                  type="button"
                  onClick={() => setVideoSourceTab('existing')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    videoSourceTab === 'existing'
                      ? 'bg-amber-400 text-black font-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">folder</span>
                  Vídeos Anexados
                </button>
              )}
            </div>

            <form onSubmit={handleAttachAndPresentVideo} className="flex flex-col gap-4 text-xs">
              {/* TAB 1: FILE UPLOAD */}
              {videoSourceTab === 'upload' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block font-bold text-white/90 mb-1">Título do Vídeo *</label>
                    <input
                      type="text"
                      value={newVideoTitle}
                      onChange={e => setNewVideoTitle(e.target.value)}
                      placeholder="Ex: Treinamento Módulo 1 - Apresentação"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-white/90 mb-1">Selecione o Arquivo de Vídeo (MP4, WebM, MOV, MKV)</label>
                    <div
                      onClick={() => modalVideoFileInputRef.current?.click()}
                      className="border-2 border-dashed border-amber-400/40 hover:border-amber-400 bg-amber-500/10 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center"
                    >
                      <span className="material-symbols-outlined text-[36px] text-amber-300">movie_edit</span>
                      {uploadedFileName ? (
                        <div>
                          <p className="font-extrabold text-amber-200 text-sm">{uploadedFileName}</p>
                          <p className="text-[10px] text-white/60">Tamanho: {uploadedFileSize} - Clique para alterar</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-white text-xs">Clique para selecionar o arquivo de vídeo do seu dispositivo</p>
                          <p className="text-[10px] text-white/50 mt-0.5">Suporta MP4, WebM, OGG, MOV e MKV</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={modalVideoFileInputRef}
                      accept="video/*"
                      onChange={(e) => handleVideoFileUpload(e, 'modal')}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: VIDEO URL */}
              {videoSourceTab === 'url' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block font-bold text-white/90 mb-1">Título do Vídeo *</label>
                    <input
                      type="text"
                      value={newVideoTitle}
                      onChange={e => setNewVideoTitle(e.target.value)}
                      placeholder="Ex: Vídeo Institucional de Vendas"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-white/90 mb-1">Link Directo do Arquivo de Vídeo (URL)</label>
                    <input
                      type="url"
                      value={newVideoUrl}
                      onChange={e => setNewVideoUrl(e.target.value)}
                      placeholder="https://exemplo.com/meu-video.mp4"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: EXISTING ATTACHED VIDEOS */}
              {videoSourceTab === 'existing' && currentMeeting?.resources && (
                <div className="flex flex-col gap-2">
                  <p className="text-white/80 font-bold mb-1">Escolha um dos vídeos previamente anexados a esta palestra:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {currentMeeting.resources
                      .filter(r => r.type === 'video' || r.fileData || (r.url && r.url.match(/\.(mp4|webm|mkv|mov)(\?.*)?$/i)))
                      .map((res, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleStartVideoPresentation(res)}
                          className="p-3 bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-amber-300">play_circle</span>
                            <div>
                              <p className="font-bold text-white group-hover:text-amber-200">{res.title}</p>
                              {res.fileSize && <span className="text-[10px] text-white/50">{res.fileSize}</span>}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-lg">
                            Transmitir
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                {videoSourceTab !== 'existing' && (
                  <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-300 text-black font-black px-5 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    <span>Anexar & Apresentar no Palco</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
