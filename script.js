document.addEventListener('DOMContentLoaded', () => {
    // State
    let students = JSON.parse(localStorage.getItem('students')) || [];

    // DOM Elements
    const form = document.getElementById('student-form');
    const resetBtn = document.getElementById('reset-btn');
    const recordsBody = document.getElementById('records-body');
    const searchInput = document.getElementById('search-input');
    const noRecordsMsg = document.getElementById('no-records-msg');
    const formError = document.getElementById('form-error');

    // Dashboard Elements
    const statTotal = document.getElementById('stat-total');
    const statPassed = document.getElementById('stat-passed');
    const statFailed = document.getElementById('stat-failed');
    const statAvg = document.getElementById('stat-avg');
    const statTop = document.getElementById('stat-top');

    // Modal Elements
    const modal = document.getElementById('view-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalBodyContent = document.getElementById('modal-body-content');

    // Initialize
    renderTable();
    updateDashboard();

    // Event Listeners
    form.addEventListener('submit', handleFormSubmit);
    resetBtn.addEventListener('click', handleReset);
    searchInput.addEventListener('input', handleSearch);
    closeModalBtn.addEventListener('click', closeModal);
    
    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Handle Form Submit
    function handleFormSubmit(e) {
        e.preventDefault();
        
        // Clear error
        formError.textContent = '';

        // Gather Data
        const name = document.getElementById('studentName').value.trim();
        const rollNo = document.getElementById('rollNumber').value.trim();
        const course = document.getElementById('course').value;
        const semester = document.getElementById('semester').value;

        // Validation
        if (!name || !rollNo || !course || !semester) {
            formError.textContent = 'Please fill all fields.';
            return;
        }

        // Check for duplicate roll number (if it's a new entry)
        const existingStudentIndex = students.findIndex(s => s.rollNo.toLowerCase() === rollNo.toLowerCase());
        if (existingStudentIndex !== -1) {
            formError.textContent = 'Roll number already exists. Please use a unique roll number or delete the existing one.';
            return;
        }

        const markInputs = document.querySelectorAll('.subject-mark');
        const subjects = [];
        let hasInvalidMarks = false;

        markInputs.forEach(input => {
            const subjectName = input.getAttribute('data-subject');
            const mark = parseInt(input.value);

            if (isNaN(mark) || mark < 0 || mark > 100) {
                hasInvalidMarks = true;
            }

            subjects.push({
                name: subjectName,
                mark: mark,
                max: 100
            });
        });

        if (hasInvalidMarks) {
            formError.textContent = 'Marks must be between 0 and 100.';
            return;
        }

        // Calculations
        const { total, percentage, grade, status } = calculateResult(subjects);

        const newStudent = {
            id: Date.now().toString(),
            name,
            rollNo,
            course,
            semester,
            subjects,
            total,
            percentage,
            grade,
            status,
            timestamp: new Date().toISOString()
        };

        // Save
        students.push(newStudent);
        saveToLocalStorage();
        
        // Update UI
        renderTable();
        updateDashboard();
        handleReset();

        // Optional: Show success message or simple animation
        const calcBtn = document.getElementById('calculate-btn');
        const originalText = calcBtn.innerHTML;
        calcBtn.innerHTML = '<i class="ph ph-check"></i> Saved!';
        calcBtn.style.background = 'var(--success)';
        setTimeout(() => {
            calcBtn.innerHTML = originalText;
            calcBtn.style.background = '';
        }, 2000);
    }

    function calculateResult(subjects) {
        let total = 0;
        let maxTotal = 0;
        let hasFailedSubject = false;

        subjects.forEach(sub => {
            total += sub.mark;
            maxTotal += sub.max;
            if (sub.mark < 40) {
                hasFailedSubject = true;
            }
        });

        const percentage = (total / maxTotal) * 100;
        
        // Determine Grade
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';

        // Status
        let status = 'PASS';
        if (hasFailedSubject || percentage < 40) {
            status = 'FAIL';
            grade = 'F'; // Ensure grade is F if they failed a subject despite high percentage
        }

        return {
            total,
            percentage: percentage.toFixed(2),
            grade,
            status
        };
    }

    function handleReset() {
        form.reset();
        formError.textContent = '';
    }

    function renderTable(filterText = '') {
        recordsBody.innerHTML = '';
        
        const filteredStudents = students.filter(student => {
            const search = filterText.toLowerCase();
            return student.name.toLowerCase().includes(search) || 
                   student.rollNo.toLowerCase().includes(search);
        });

        if (filteredStudents.length === 0) {
            noRecordsMsg.classList.remove('hidden');
        } else {
            noRecordsMsg.classList.add('hidden');
            
            // Sort by timestamp descending
            filteredStudents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(student => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${student.rollNo}</strong></td>
                    <td>${student.name}</td>
                    <td>${student.total} / 500</td>
                    <td>${student.percentage}%</td>
                    <td><span class="badge grade">${student.grade}</span></td>
                    <td><span class="badge ${student.status.toLowerCase()}">${student.status}</span></td>
                    <td class="action-buttons">
                        <button type="button" class="btn btn-sm btn-info view-btn" data-id="${student.id}" title="View Details">
                            <i class="ph ph-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger delete-btn" data-id="${student.id}" title="Delete Record">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
                `;
                recordsBody.appendChild(tr);
            });

            // Attach event listeners to dynamically created buttons
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', () => openModal(btn.getAttribute('data-id')));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteRecord(btn.getAttribute('data-id')));
            });
        }
    }

    function handleSearch(e) {
        renderTable(e.target.value);
    }

    function deleteRecord(id) {
        if (confirm('Are you sure you want to delete this record?')) {
            students = students.filter(s => s.id !== id);
            saveToLocalStorage();
            renderTable(searchInput.value);
            updateDashboard();
        }
    }

    function openModal(id) {
        const student = students.find(s => s.id === id);
        if (!student) return;

        let subjectsHtml = '';
        student.subjects.forEach(sub => {
            const isPass = sub.mark >= 40;
            subjectsHtml += `
                <div class="detail-row">
                    <span>${sub.name}</span>
                    <strong style="color: ${isPass ? 'var(--success)' : 'var(--danger)'}">${sub.mark} / ${sub.max}</strong>
                </div>
            `;
        });

        modalBodyContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="color: var(--primary); margin-bottom: 0.5rem;">${student.name}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Roll No: ${student.rollNo} | ${student.course}, Sem ${student.semester}</p>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 1rem; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase;">Subject Marks</h4>
                ${subjectsHtml}
            </div>
            
            <div class="summary-box">
                <div>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Total</span>
                    <h3 style="margin-top: 0.25rem;">${student.total}</h3>
                </div>
                <div>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Percentage</span>
                    <h3 style="margin-top: 0.25rem;">${student.percentage}%</h3>
                </div>
                <div>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Grade</span>
                    <h3 style="margin-top: 0.25rem;">${student.grade}</h3>
                </div>
                <div>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Status</span>
                    <h3 style="margin-top: 0.25rem; color: ${student.status === 'PASS' ? 'var(--success)' : 'var(--danger)'}">${student.status}</h3>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function updateDashboard() {
        const total = students.length;
        if (total === 0) {
            statTotal.textContent = '0';
            statPassed.textContent = '0';
            statFailed.textContent = '0';
            statAvg.textContent = '0%';
            statTop.textContent = '-';
            return;
        }

        let passed = 0;
        let failed = 0;
        let totalPercentage = 0;
        let topStudent = null;
        let highestPercentage = -1;

        students.forEach(student => {
            if (student.status === 'PASS') passed++;
            else failed++;

            const p = parseFloat(student.percentage);
            totalPercentage += p;

            if (p > highestPercentage) {
                highestPercentage = p;
                topStudent = student;
            }
        });

        const avg = (totalPercentage / total).toFixed(1);

        statTotal.textContent = total;
        statPassed.textContent = passed;
        statFailed.textContent = failed;
        statAvg.textContent = `${avg}%`;
        
        if (topStudent) {
            statTop.innerHTML = `${topStudent.name} <br><span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted)">(${topStudent.percentage}%)</span>`;
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem('students', JSON.stringify(students));
    }
});
