// Quiz Application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let currentQuestionIndex = 0;
    let totalQuestions = 30;
    let answeredQuestions = [];
    let flaggedQuestions = [];
    let remainingTime = 5400; // 90 minutes in seconds
    let passingScore = 60;
    let currentScore = 0;
    let totalMarks = 100;
    
    // Sample questions data - in a real application, this would come from the backend
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
        // More questions would be defined here
    ];
    
    // DOM elements
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
        // Display question navigation buttons
        createQuestionButtons();
        
        // Set initial values
        totalQuestionsElement.textContent = totalQuestions;
        totalScoreElement.textContent = totalMarks;
        
        // Load first question
        loadQuestion(currentQuestionIndex);
        
        // Start timer
        startTimer();
        
        // Initialize anti-cheating measures
        initAntiCheating();
    }
    
    // Create question navigation buttons
    function createQuestionButtons() {
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
    
    // Load a question
    function loadQuestion(index) {
        // In a real app, we'd fetch this from the questions array
        // For demo purposes, we'll just use the first two questions in rotation
        const questionData = questions[index % questions.length];
        
        currentQuestionIndex = index;
        currentQuestionNumber.textContent = index + 1;
        questionMarks.textContent = questionData.marks;
        
        // Update question content
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
        
        // Set hint text
        hintText.textContent = questionData.hint;
        
        // Hide hint container
        hintContainer.style.display = 'none';
        
        // Update question buttons
        updateQuestionButtons();
        
        // Check if this question was already answered
        if (answeredQuestions.includes(index)) {
            // In a real app, we'd load the saved answer
            // For demo purposes, we'll just simulate it
            const randomOption = Math.floor(Math.random() * 4) + 1;
            document.getElementById(`option${randomOption}`).checked = true;
        }
    }
    
    // Update question navigation buttons
    function updateQuestionButtons() {
        const buttons = questionButtons.querySelectorAll('.question-btn');
        
        buttons.forEach((button, index) => {
            // Remove all classes first
            button.classList.remove('active', 'answered', 'flagged');
            
            // Add appropriate classes
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
    
    // Save answer
    function saveAnswer() {
        const selectedOption = document.querySelector('input[name="answer"]:checked');
        
        if (selectedOption) {
            // In a real app, we'd save the answer to a database or local storage
            
            // Add to answered questions if not already there
            if (!answeredQuestions.includes(currentQuestionIndex)) {
                answeredQuestions.push(currentQuestionIndex);
                answeredCount.textContent = answeredQuestions.length;
                
                // Update score (in a real app, we'd check if the answer is correct)
                // For demo purposes, we'll use random scoring
                const isCorrect = Math.random() > 0.5;
                if (isCorrect) {
                    const questionData = questions[currentQuestionIndex % questions.length];
                    currentScore += questionData.marks;
                    currentScoreElement.textContent = currentScore;
                    
                    // Update pass status
                    updatePassStatus();
                }
            }
            
            // Update UI
            updateQuestionButtons();
            
            // Show success message
            alert('Answer saved successfully!');
        } else {
            alert('Please select an answer before saving.');
        }
    }
    
    // Flag/unflag a question
    function toggleFlag() {
        const index = currentQuestionIndex;
        
        if (flaggedQuestions.includes(index)) {
            // Remove flag
            flaggedQuestions = flaggedQuestions.filter(q => q !== index);
            flagButton.textContent = 'Flag for Review';
        } else {
            // Add flag
            flaggedQuestions.push(index);
            flagButton.textContent = 'Unflag Question';
        }
        
        // Update UI
        updateQuestionButtons();
    }
    
    // Update pass status
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
    
    // Get total marks of completed questions
    function getCompletedMarks() {
        let marks = 0;
        
        answeredQuestions.forEach(index => {
            const questionData = questions[index % questions.length];
            marks += questionData.marks;
        });
        
        return marks;
    }
    
    // Start timer
    function startTimer() {
        const timerInterval = setInterval(() => {
            remainingTime--;
            
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                alert('Time\'s up! Your exam will be submitted automatically.');
                // In a real app, we'd submit the exam here
            }
            
            // Update timer display
            updateTimerDisplay();
            
            // Add warning classes when time is running low
            if (remainingTime <= 300) { // 5 minutes
                timer.classList.add('danger');
            } else if (remainingTime <= 600) { // 10 minutes
                timer.classList.add('warning');
            }
        }, 1000);
    }
    
    // Update timer display
    function updateTimerDisplay() {
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = remainingTime % 60;
        
        timer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Initialize anti-cheating measures
    function initAntiCheating() {
        // Detect tab/window changes
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                // Record suspicious activity
                showWarningModal();
            }
        });
        
        // Prevent right-click
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
        
        // Prevent keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Prevent Ctrl+C, Ctrl+V, Ctrl+F, F12, Alt+Tab
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
        
        // Monitor for full-screen exit
        document.addEventListener('fullscreenchange', function() {
            if (!document.fullscreenElement) {
                showWarningModal();
            }
        });
        
        // Request full screen on start (in a real app)
        // document.documentElement.requestFullscreen();
    }
    
    // Show warning modal
    function showWarningModal() {
        warningModal.style.display = 'flex';
    }
    
    // Event listeners
    hintButton.addEventListener('click', function() {
        hintContainer.style.display = hintContainer.style.display === 'none' ? 'block' : 'none';
    });
    
    prevButton.addEventListener('click', function() {
        if (currentQuestionIndex > 0) {
            loadQuestion(currentQuestionIndex - 1);
        }
    });
    
    nextButton.addEventListener('click', function() {
        if (currentQuestionIndex < totalQuestions - 1) {
            loadQuestion(currentQuestionIndex + 1);
        }
    });
    
    saveButton.addEventListener('click', saveAnswer);
    
    flagButton.addEventListener('click', toggleFlag);
    
    acknowledgeButton.addEventListener('click', function() {
        warningModal.style.display = 'none';
    });
    
    // Initialize the quiz
    initializeQuiz();
});
