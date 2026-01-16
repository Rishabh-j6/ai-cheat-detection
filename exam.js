// Quiz Application JavaScript with Firebase Email/Password Authentication
document.addEventListener('DOMContentLoaded', function() {
    // ---------------------------
    // ====== FIREBASE SETUP =====
    // ---------------------------
    // Replace the values below with your Firebase project's config
    const firebaseConfig = {
        apiKey: "REPLACE_WITH_YOUR_API_KEY",
        authDomain: "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
        projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
        storageBucket: "REPLACE_WITH_YOUR_PROJECT.appspot.com",
        messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
        appId: "REPLACE_WITH_APP_ID"
    };

    // Initialize Firebase (compat)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app();
    }
    const auth = firebase.auth();

    // ---------------------------
    // ====== AUTH HELPERS =======
    // ---------------------------
    async function signUp(email, password) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.sendEmailVerification();
            alert('Sign up successful! Verification email sent — check your inbox.');
            return userCredential.user;
        } catch (err) {
            console.error('SignUp Error:', err);
            alert('Sign up failed: ' + err.message);
        }
    }

    async function signIn(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            alert('Signed in as ' + userCredential.user.email);
            return userCredential.user;
        } catch (err) {
            console.error('SignIn Error:', err);
            alert('Sign in failed: ' + err.message);
        }
    }

    async function signOutUser() {
        try {
            await auth.signOut();
            alert('Signed out.');
        } catch (err) {
            console.error('SignOut Error:', err);
            alert('Sign out failed: ' + err.message);
        }
    }

    async function sendPasswordReset(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            alert('Password reset email sent — check your inbox.');
        } catch (err) {
            console.error('Reset Error:', err);
            alert('Password reset failed: ' + err.message);
        }
    }

    // Observe auth state and update UI
    auth.onAuthStateChanged(user => {
        const userEmailEl = document.getElementById('user-email');
        const authStatusEl = document.getElementById('auth-status');
        if (user) {
            // user is signed in
            if (userEmailEl) userEmailEl.textContent = user.email + (user.emailVerified ? ' (verified)' : ' (not verified)');
            if (authStatusEl) authStatusEl.textContent = 'Signed in';
            // Optionally, restrict some actions unless emailVerified
        } else {
            // user signed out
            if (userEmailEl) userEmailEl.textContent = 'Not signed in';
            if (authStatusEl) authStatusEl.textContent = 'Signed out';
        }
    });

    // ---------------------------
    // ====== AUTH UI BINDING ====
    // ---------------------------
    // Expected HTML IDs (I'll list the sample HTML below)
    const signupBtn = document.getElementById('signup-btn');
    const signinBtn = document.getElementById('signin-btn');
    const signoutBtn = document.getElementById('signout-btn');
    const resetBtn = document.getElementById('reset-btn');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');

    if (signupBtn) signupBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) return alert('Enter email and password to sign up.');
        signUp(email, password);
    });

    if (signinBtn) signinBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) return alert('Enter email and password to sign in.');
        signIn(email, password);
    });

    if (signoutBtn) signoutBtn.addEventListener('click', () => {
        signOutUser();
    });

    if (resetBtn) resetBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (!email) return alert('Enter your email to receive a password reset link.');
        sendPasswordReset(email);
    });

    // ---------------------------
    // ====== YOUR QUIZ CODE =====
    // ---------------------------
    // (I preserved your existing quiz implementation — only minor adjustments)
    let currentQuestionIndex = 0;
    let totalQuestions = 30;
    let answeredQuestions = [];
    let flaggedQuestions = [];
    let remainingTime = 5400; // 90 minutes in seconds
    let passingScore = 60;
    let currentScore = 0;
    let totalMarks = 100;

    // Sample questions data
    const questions = [
        {
            id: 1,
            text: "What is the time complexity of a binary search algorithm?",
            options: [
                "A) O(n)",
                "B) O(log n)",
                "C) O(n²)",
                "D) O(n log n)"
            ],
            correctAnswer: "B",
            marks: 5,
            hint: "Think about how the search space is divided with each comparison."
        },
        {
            id: 2,
            text: "Which of the following is NOT a JavaScript data type?",
            options: [
                "A) String",
                "B) Boolean",
                "C) Float",
                "D) Object"
            ],
            correctAnswer: "C",
            marks: 3,
            hint: "JavaScript has primitive and non-primitive data types."
        },
        // More questions...
    ];

    // DOM elements (your existing IDs)
    const timer = document.getElementById('timer');
    const questionButtons = document.getElementById('question-buttons');
    const currentQuestionNumber = document.getElementById('current-question-number');
    const questionMarks = document.getElementById('question-marks');
    const currentQuestion = document.getElementById('current-question');
    const hintButton = document.getElementById('hint-button');
    const hintContainer = document.getElementById('hint-container');
    const hintText = document.getElementById('hint-text');
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    const saveButton = document.getElementById('save-answer');
    const flagButton = document.getElementById('flag-question');
    const answeredCount = document.getElementById('answered-count');
    const totalQuestionsElement = document.getElementById('total-questions');
    const currentScoreElement = document.getElementById('current-score');
    const totalScoreElement = document.getElementById('total-score');
    const passStatus = document.getElementById('pass-status');
    const warningModal = document.getElementById('warning-modal');
    const acknowledgeButton = document.getElementById('acknowledge-warning');

    // Initialize the quiz
    function initializeQuiz() {
        createQuestionButtons();
        totalQuestionsElement.textContent = totalQuestions;
        totalScoreElement.textContent = totalMarks;
        loadQuestion(currentQuestionIndex);
        startTimer();
        initAntiCheating();
    }

    function createQuestionButtons() {
        questionButtons.innerHTML = '';
        for (let i = 1; i <= totalQuestions; i++) {
            const button = document.createElement('button');
            button.className = 'question-btn';
            button.textContent = i;
            button.dataset.index = i - 1;

            button.addEventListener('click', function() {
                loadQuestion(parseInt(this.dataset.index));
            });

            questionButtons.appendChild(button);
        }
    }

    function loadQuestion(index) {
        const questionData = questions[index % questions.length];

        currentQuestionIndex = index;
        currentQuestionNumber.textContent = index + 1;
        questionMarks.textContent = questionData.marks;

        currentQuestion.innerHTML = `
            <p>${questionData.text}</p>
            <div class="options">
                ${questionData.options.map((option, i) => `
                    <div class="option">
                        <input type="radio" id="option${i+1}" name="answer" value="${String.fromCharCode(65 + i)}">
                        <label for="option${i+1}">${option}</label>
                    </div>
                `).join('')}
            </div>
        `;

        hintText.textContent = questionData.hint;
        hintContainer.style.display = 'none';
        updateQuestionButtons();

        if (answeredQuestions.includes(index)) {
            const randomOption = Math.floor(Math.random() * 4) + 1;
            const el = document.getElementById(`option${randomOption}`);
            if (el) el.checked = true;
        }
    }

    function updateQuestionButtons() {
        const buttons = questionButtons.querySelectorAll('.question-btn');

        buttons.forEach((button, index) => {
            button.classList.remove('active', 'answered', 'flagged');

            if (index === currentQuestionIndex) {
                button.classList.add('active');
            }

            if (answeredQuestions.includes(index)) {
                button.classList.add('answered');
            }

            if (flaggedQuestions.includes(index)) {
                button.classList.add('flagged');
            }
        });
    }

    function saveAnswer() {
        const selectedOption = document.querySelector('input[name="answer"]:checked');

        if (selectedOption) {
            if (!answeredQuestions.includes(currentQuestionIndex)) {
                answeredQuestions.push(currentQuestionIndex);
                if (answeredCount) answeredCount.textContent = answeredQuestions.length;

                // Demo scoring: random correctness
                const isCorrect = Math.random() > 0.5;
                if (isCorrect) {
                    const questionData = questions[currentQuestionIndex % questions.length];
                    currentScore += questionData.marks;
                    if (currentScoreElement) currentScoreElement.textContent = currentScore;
                    updatePassStatus();
                }
            }
            updateQuestionButtons();
            alert('Answer saved successfully!');
        } else {
            alert('Please select an answer before saving.');
        }
    }

    function toggleFlag() {
        const index = currentQuestionIndex;
        if (flaggedQuestions.includes(index)) {
            flaggedQuestions = flaggedQuestions.filter(q => q !== index);
            flagButton.textContent = 'Flag for Review';
        } else {
            flaggedQuestions.push(index);
            flagButton.textContent = 'Unflag Question';
        }
        updateQuestionButtons();
    }

    function updatePassStatus() {
        if (currentScore >= passingScore) {
            passStatus.textContent = 'Pass';
            passStatus.className = 'status-pass';
        } else if (currentScore + (totalMarks - getCompletedMarks()) < passingScore) {
            passStatus.textContent = 'Fail';
            passStatus.className = 'status-fail';
        } else {
            passStatus.textContent = 'Pending';
            passStatus.className = 'status-pending';
        }
    }

    function getCompletedMarks() {
        let marks = 0;
        answeredQuestions.forEach(index => {
            const questionData = questions[index % questions.length];
            marks += questionData.marks;
        });
        return marks;
    }

    // Initialize progress from localStorage or set to 100%
    let progress = parseInt(localStorage.getItem('progress')) || 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        setProgressBarStyle(progress);
        progressBar.style.width = progress + '%';
        progressBar.setAttribute('aria-valuenow', progress);
    }

    function updateProgress() {
        const progressTextEl = document.getElementById('progressText');
        if (progressTextEl) progressTextEl.textContent = progress + '%';

        progress = Math.max(0, progress - 20);
        localStorage.setItem('progress', progress);
        if (progressBar) {
            progressBar.style.width = progress + '%';
            progressBar.setAttribute('aria-valuenow', progress);
            setProgressBarStyle(progress);
        }
        if (progressTextEl) progressTextEl.textContent = progress + '%';

        if (progress <= 0) {
            alert('Progress has reached 0%!');
        }
    }

    function setProgressBarStyle(value) {
        if (!progressBar) return;
        progressBar.classList.remove('bg-success', 'bg-warning', 'bg-danger', 'bg-info');

        if (value > 60) {
            progressBar.classList.add('bg-success');
        } else if (value > 30) {
            progressBar.classList.add('bg-warning');
        } else {
            progressBar.classList.add('bg-danger');
        }
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            updateProgress();
        }
    });

    function startTimer() {
        const timerInterval = setInterval(() => {
            remainingTime--;

            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                alert('Time\'s up! Your exam will be submitted automatically.');
                // TODO: call submitExam()
            }

            updateTimerDisplay();

            if (remainingTime <= 300) {
                if (timer) timer.classList.add('danger');
            } else if (remainingTime <= 600) {
                if (timer) timer.classList.add('warning');
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = remainingTime % 60;

        if (timer) timer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function initAntiCheating() {
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                showWarningModal();
            }
        });

        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });

        document.addEventListener('keydown', function(e) {
            if (
                (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'f')) ||
                e.key === 'F12' ||
                (e.altKey && e.key === 'Tab')
            ) {
                e.preventDefault();
                showWarningModal();
                return false;
            }
        });

        document.addEventListener('fullscreenchange', function() {
            if (!document.fullscreenElement) {
                showWarningModal();
            }
        });
    }

    function showWarningModal() {
        if (warningModal) warningModal.style.display = 'flex';
    }

    // Event listeners for your quiz controls
    if (hintButton) hintButton.addEventListener('click', function() {
        if (hintContainer) hintContainer.style.display = hintContainer.style.display === 'none' ? 'block' : 'none';
    });

    if (prevButton) prevButton.addEventListener('click', function() {
        if (currentQuestionIndex > 0) loadQuestion(currentQuestionIndex - 1);
    });

    if (nextButton) nextButton.addEventListener('click', function() {
        if (currentQuestionIndex < totalQuestions - 1) loadQuestion(currentQuestionIndex + 1);
    });

    if (saveButton) saveButton.addEventListener('click', saveAnswer);
    if (flagButton) flagButton.addEventListener('click', toggleFlag);
    if (acknowledgeButton) acknowledgeButton.addEventListener('click', function() {
        if (warningModal) warningModal.style.display = 'none';
    });

    // Initialize the quiz
    initializeQuiz();
});
