document.addEventListener('DOMContentLoaded', function() {
    // Audio context and elements
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioSource, analyser;
    let currentAudio = new Audio();
    let isPlaying = false;
    let currentTrackIndex = -1;
    let playlist = [];
    
    // DOM elements
    const playButton = document.querySelector('.play');
    const pauseButton = document.querySelector('.pause');
    const stopButton = document.querySelector('.stop');
    const prevButton = document.querySelector('.prev');
    const nextButton = document.querySelector('.next');
    const volumeSlider = document.querySelector('.volume-slider');
    const timeDisplay = document.querySelector('.time-display');
    const trackNameDisplay = document.querySelector('.track-name');
    const artistNameDisplay = document.querySelector('.artist-name');
    const visualizer = document.querySelector('.visualizer');
    const playlistContainer = document.querySelector('.playlist');
    const addFilesButton = document.querySelector('.add-files');
    const fileInputContainer = document.querySelector('.file-input-container');
    const fileUrlInput = document.querySelector('#file-url');
    const addUrlButton = document.querySelector('#add-url');
    const localFilesInput = document.querySelector('#local-files');
    
    // Initialize visualizer bars
    for (let i = 0; i < 64; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.left = `${i * 5}px`;
        bar.style.height = '0px';
        visualizer.appendChild(bar);
    }
    const visualizerBars = document.querySelectorAll('.visualizer-bar');
    
    // Setup audio analyzer
    function setupAudioAnalyzer() {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        audioSource = audioContext.createMediaElementSource(currentAudio);
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
    }
    
    // Update visualizer
    function updateVisualizer() {
        if (!analyser) return;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        visualizerBars.forEach((bar, i) => {
            const value = dataArray[i] || 0;
            bar.style.height = `${value / 2}px`;
            bar.style.backgroundColor = `rgb(0, ${value}, 0)`;
        });
        
        if (isPlaying) {
            requestAnimationFrame(updateVisualizer);
        }
    }
    
    // Format time (seconds to MM:SS)
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Update time display
    function updateTimeDisplay() {
        if (currentAudio.duration) {
            timeDisplay.textContent = `${formatTime(currentAudio.currentTime)} / ${formatTime(currentAudio.duration)}`;
        } else {
            timeDisplay.textContent = '00:00 / 00:00';
        }
    }
    
    // Play track
    function playTrack(index) {
        if (index < 0 || index >= playlist.length) return;
        
        currentTrackIndex = index;
        const track = playlist[currentTrackIndex];
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Stop current audio if playing
        if (isPlaying) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        
        // Load new track
        currentAudio = new Audio(track.url);
        setupAudioAnalyzer();
        
        // Update UI
        trackNameDisplay.textContent = track.name || 'Unknown Track';
        artistNameDisplay.textContent = track.artist || 'Unknown Artist';
        
        // Highlight active track in playlist
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.playlist-item')[currentTrackIndex].classList.add('active');
        
        // Set up event listeners
        currentAudio.addEventListener('loadedmetadata', () => {
            updateTimeDisplay();
        });
        
        currentAudio.addEventListener('timeupdate', () => {
            updateTimeDisplay();
        });
        
        currentAudio.addEventListener('ended', () => {
            playNext();
        });
        
        // Play the track
        currentAudio.play()
            .then(() => {
                isPlaying = true;
                playButton.style.display = 'none';
                pauseButton.style.display = 'block';
                updateVisualizer();
            })
            .catch(error => {
                console.error('Playback failed:', error);
            });
    }
    
    // Play next track
    function playNext() {
        if (playlist.length === 0) return;
        
        const nextIndex = (currentTrackIndex + 1) % playlist.length;
        playTrack(nextIndex);
    }
    
    // Play previous track
    function playPrev() {
        if (playlist.length === 0) return;
        
        let prevIndex = currentTrackIndex - 1;
        if (prevIndex < 0) prevIndex = playlist.length - 1;
        
        // If track is just starting, go to previous track
        if (currentAudio.currentTime > 3) {
            currentAudio.currentTime = 0;
        } else {
            playTrack(prevIndex);
        }
    }
    
    // Add track to playlist
    function addToPlaylist(track) {
        playlist.push(track);
        
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        playlistItem.innerHTML = `
            <span>${track.name || 'Unknown Track'}</span>
            <span class="remove">×</span>
        `;
        
        playlistItem.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove')) {
                // Remove track from playlist
                const index = Array.from(playlistContainer.children).indexOf(this);
                playlist.splice(index, 1);
                this.remove();
                
                // Adjust current track index if needed
                if (index < currentTrackIndex) {
                    currentTrackIndex--;
                } else if (index === currentTrackIndex) {
                    currentAudio.pause();
                    isPlaying = false;
                    playButton.style.display = 'block';
                    pauseButton.style.display = 'none';
                    currentTrackIndex = -1;
                    trackNameDisplay.textContent = 'No track loaded';
                    artistNameDisplay.textContent = '';
                }
            } else {
                // Play the track
                const index = Array.from(playlistContainer.children).indexOf(this);
                playTrack(index);
            }
        });
        
        playlistContainer.appendChild(playlistItem);
        
        // If this is the first track, play it
        if (playlist.length === 1) {
            playTrack(0);
        }
    }
    
    // Extract filename from URL
    function getFilenameFromUrl(url) {
        return url.split('/').pop().split('?')[0];
    }
    
    // Event listeners
    playButton.addEventListener('click', function() {
        if (playlist.length === 0) return;
        
        if (currentTrackIndex === -1) {
            playTrack(0);
        } else {
            currentAudio.play()
                .then(() => {
                    isPlaying = true;
                    playButton.style.display = 'none';
                    pauseButton.style.display = 'block';
                    updateVisualizer();
                });
        }
    });
    
    pauseButton.addEventListener('click', function() {
        currentAudio.pause();
        isPlaying = false;
        playButton.style.display = 'block';
        pauseButton.style.display = 'none';
    });
    
    stopButton.addEventListener('click', function() {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        isPlaying = false;
        playButton.style.display = 'block';
        pauseButton.style.display = 'none';
        updateTimeDisplay();
    });
    
    prevButton.addEventListener('click', playPrev);
    nextButton.addEventListener('click', playNext);
    
    volumeSlider.addEventListener('input', function() {
        currentAudio.volume = this.value;
    });
    
    addFilesButton.addEventListener('click', function() {
        fileInputContainer.style.display = fileInputContainer.style.display === 'none' ? 'block' : 'none';
    });
    
    addUrlButton.addEventListener('click', function() {
        const url = fileUrlInput.value.trim();
        if (url) {
            const filename = getFilenameFromUrl(url);
            addToPlaylist({
                name: filename,
                url: url
            });
            fileUrlInput.value = '';
        }
    });
    
    localFilesInput.addEventListener('change', function() {
        Array.from(this.files).forEach(file => {
            const url = URL.createObjectURL(file);
            addToPlaylist({
                name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                url: url
            });
        });
        this.value = '';
    });
    
    // Sample playlist (optional)
    addToPlaylist({
        name: "Kalimba",
       artist: "Mr Scruff",
        url: "https://kelasmaster.github.io/winampmusic-player/Kalimba.mp3"
    });
    addToPlaylist({
        name: "Sleep Away",
         artist: "Bob Acri",
        url: "https://kelasmaster.github.io/winampmusic-player/Sleep%20Away.mp3"
    });
    addToPlaylist({
        name: "Maid with the Flaxen Hair",
         artist: "Richard Stolzman",
        url: "https://kelasmaster.github.io/winampmusic-player/Maid-with-the-Flaxen-Hair.mp3"
    });
    
    // Initialize volume
    currentAudio.volume = volumeSlider.value;
});
