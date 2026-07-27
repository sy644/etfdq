const display = document.getElementById('display');
let currentInput = '0';
let previousInput = '';
let operator = null;
let shouldResetDisplay = false;

function updateDisplay() { display.textContent = currentInput; }

function inputNumber(value) {
    if (shouldResetDisplay) { currentInput = value; shouldResetDisplay = false; }
    else { currentInput = currentInput === '0' ? value : currentInput + value; }
    updateDisplay();
}

function inputOperator(op) {
    if (operator && !shouldResetDisplay) { calculate(); }
    previousInput = currentInput;
    operator = op;
    shouldResetDisplay = true;
}

function calculate() {
    const prev = parseFloat(previousInput);
    const curr = parseFloat(currentInput);
    if (isNaN(prev) || isNaN(curr)) return;
    let result;
    switch (operator) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': result = curr === 0 ? 'Error' : prev / curr; break;
        default: return;
    }
    currentInput = result.toString();
    operator = null;
    previousInput = '';
    shouldResetDisplay = true;
    updateDisplay();
}

function clearAll() {
    currentInput = '0';
    previousInput = '';
    operator = null;
    shouldResetDisplay = false;
    updateDisplay();
}

// --- 事件监听 ---
document.querySelectorAll('.number').forEach(btn => {
    btn.addEventListener('click', () => inputNumber(btn.dataset.value));
});

document.querySelectorAll('.operator').forEach(btn => {
    btn.addEventListener('click', () => inputOperator(btn.dataset.value));
});

document.getElementById('equals').addEventListener('click', calculate);
document.getElementById('clear').addEventListener('click', clearAll);