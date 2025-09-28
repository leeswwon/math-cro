import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenerativeAI } from "@google/generative-ai";

//========== TYPES (타입 정의) ==========
export enum CellType {
  GIVEN = 'GIVEN',
  INPUT = 'INPUT',
  EMPTY = 'EMPTY',
  REVEALED = 'REVEALED',
}
export interface GridCell {
  type: CellType;
  value: string | null;
}
export interface Puzzle {
  grid: GridCell[][];
  solution: Record<string, number>;
  keypad: number[];
}
export interface CellPosition {
  row: number;
  col: number;
}
export type GameStatus = 'LOADING' | 'PLAYING' | 'WON' | 'LOST' | 'ERROR';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

//========== ICONS (아이콘 컴포넌트) ==========
type IconProps = React.SVGProps<SVGSVGElement>;
const RefreshCwIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 0 1 9-9c2.39 0 4.68.94 6.34 2.6" /><path d="M21 3v6h-6" /><path d="M21 12a9 9 0 0 1-9 9c-2.39 0-4.68-.94-6.34-2.6" /><path d="M3 21v-6h6" /></svg>
);
const HeartIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
);
const PartyPopperIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5.8 11.3 2 22l10.7-3.79" /><path d="M4 14.8 13.2 5.6" /><path d="m14 4 6 6" /><path d="M10.4 15.6 14 12l.4-4.5 2.1-.1-2.1-2.1.1-2.1-4.5.4-3.6 3.6" /><path d="M18 8.4 22 12" /></svg>
);
const FrownIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>
);
const AlertTriangleIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
);
const ArrowRightIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);

//========== CHILD COMPONENTS (작은 부품 컴포넌트) ==========
const LoadingSpinner: React.FC = () => {
    const loadingMessages = ["완벽한 챌린지를 생성 중...","연필을 깎는 중...","숫자를 계산하고 있어요...","X, Y, Z 값을 푸는 중...","알고 계셨나요? 수학 퍼즐은 기억력을 향상시킬 수 있어요.","두뇌 운동을 준비하세요!","0으로 나누는 중... 농담이에요!",];
    const [messageIndex, setMessageIndex] = useState(0);
    useEffect(() => {
        const intervalId = setInterval(() => {setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);}, 2500);
        return () => clearInterval(intervalId);
    }, []);
    return (<div className="flex flex-col items-center justify-center gap-4 text-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><p className="text-slate-600 font-medium px-4 h-10 flex items-center transition-opacity duration-500">{loadingMessages[messageIndex]}</p></div>);
};

const GameHeader: React.FC<{level: number; score: number; highScore: number; mistakes: number; maxMistakes: number; onRestart: () => void; difficulty: Difficulty;}> = ({level, score, highScore, mistakes, maxMistakes, onRestart, difficulty}) => {
    const DifficultyBadge: React.FC<{ difficulty: Difficulty }> = ({ difficulty }) => {
        const colors = {Easy: 'bg-green-100 text-green-800', Medium: 'bg-yellow-100 text-yellow-800', Hard: 'bg-red-100 text-red-800',};
        return (<span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[difficulty]}`}>{difficulty}</span>);
    };
    return (<div className="flex justify-between items-center w-full"><div className='flex items-center gap-2'><button onClick={onRestart} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"><RefreshCwIcon className="w-5 h-5" /></button><DifficultyBadge difficulty={difficulty} /></div><div className="text-center"><div className="text-sm font-semibold text-gray-500">LEVEL</div><div className="text-2xl font-bold text-gray-900">{level}</div></div><div className="text-center"><div className="text-sm font-semibold text-gray-500">SCORE</div><div className="flex items-baseline justify-center gap-1"><div className="text-2xl font-bold text-gray-900">{score}</div><div className="text-sm text-gray-400 font-medium">/ {highScore}</div></div></div><div className="flex items-center gap-1">{[...Array(maxMistakes)].map((_, i) => (<HeartIcon key={i} className={`w-6 h-6 ${i < maxMistakes - mistakes ? 'text-red-500 fill-current' : 'text-gray-300'}`} />))}</div></div>);
};

const GameBoard: React.FC<{grid: GridCell[][]; onCellClick: (row: number, col: number) => void; selectedCell: CellPosition | null; wrongInputCell: CellPosition | null;}> = ({ grid, onCellClick, selectedCell, wrongInputCell }) => {
    if (!grid || grid.length === 0) { return <div className="aspect-square w-full bg-gray-200 rounded-lg animate-pulse"></div>; }
    const getCellClass = (cell: GridCell, row: number, col: number) => {
        let baseClass = "flex items-center justify-center aspect-square text-lg md:text-xl font-bold rounded-md transition-all duration-150";
        if (cell.type === CellType.EMPTY) { return "bg-transparent"; }
        baseClass += " bg-white border";
        if (cell.type === CellType.GIVEN) { baseClass += " border-gray-200 text-gray-900 bg-gray-50"; }
        else if (cell.type === CellType.REVEALED) { baseClass += " border-gray-200 text-green-600 bg-green-50 font-bold"; }
        else if (cell.type === CellType.INPUT) {
            baseClass += " border-gray-300 border-dashed cursor-pointer hover:bg-blue-50";
            if (selectedCell && selectedCell.row === row && selectedCell.col === col) { baseClass += " !border-blue-500 !bg-blue-100 border-solid !border-2"; }
            if (wrongInputCell && wrongInputCell.row === row && wrongInputCell.col === col) { baseClass += " animate-shake"; }
        }
        return baseClass;
    };
    return (<div className="grid grid-cols-8 gap-1 p-2 bg-white rounded-lg shadow-inner bg-gray-50 border border-gray-200" style={{ aspectRatio: '1 / 1' }}>{grid.map((row, rowIndex) => row.map((cell, colIndex) => (<div key={`${rowIndex}-${colIndex}`} className={getCellClass(cell, rowIndex, colIndex)} onClick={() => onCellClick(rowIndex, colIndex)}>{cell.value}</div>)))}</div>);
};

const NumberPad: React.FC<{numbers: number[]; onNumberClick: (num: number) => void; disabled: boolean;}> = ({ numbers, onNumberClick, disabled }) => {
    const padSize = 15;
    const displayNumbers = [...new Set(numbers)];
    while (displayNumbers.length < padSize && displayNumbers.length > 0) { displayNumbers.push(displayNumbers[Math.floor(Math.random() * displayNumbers.length)]); }
    const shuffledNumbers = displayNumbers.sort(() => Math.random() - 0.5);
    return (<div className="grid grid-cols-5 gap-2">{shuffledNumbers.slice(0, padSize).map((num, index) => (<button key={index} onClick={() => onNumberClick(num)} disabled={disabled} className="flex items-center justify-center p-2 h-12 text-xl font-bold bg-gray-100 rounded-lg border border-gray-200 hover:bg-gray-200 active:scale-95 transform transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none">{num}</button>))}</div>);
};

const GameOverlay: React.FC<{status: GameStatus; onRestart: () => void; onNextLevel: () => void; onRetry: () => void; onRestartFromLevel1: () => void; difficulty: Difficulty;}> = ({ status, onRestart, onNextLevel, onRetry, onRestartFromLevel1, difficulty }) => {
    const getLostTitle = (diff: Difficulty) => { switch (diff) { case 'Easy': return '초등학교 실패'; case 'Medium': return '중학교 실패'; case 'Hard': return '고등학교 실패'; default: return 'Game Over'; } };
    const content = {
        WON: { icon: <PartyPopperIcon className="w-16 h-16 text-green-500" />, title: 'Level Complete!', message: 'Great job! Ready for the next challenge?', buttons: (<button onClick={onNextLevel} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">Next Level <ArrowRightIcon className="w-5 h-5" /></button>),},
        LOST: { icon: <FrownIcon className="w-16 h-16 text-red-500" />, title: getLostTitle(difficulty), message: "정답을 확인하고 다시 도전해보세요!", buttons: (<button onClick={onRestartFromLevel1} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors">1레벨부터 다시 시작 <RefreshCwIcon className="w-5 h-5" /></button>),},
        ERROR: { icon: <AlertTriangleIcon className="w-16 h-16 text-yellow-500" />, title: 'An Error Occurred', message: 'Could not create a puzzle. Please try again.', buttons: (<button onClick={onRestart} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors">Try Again <RefreshCwIcon className="w-5 h-5" /></button>),},
        PLAYING: null, LOADING: null,
    };
    const currentContent = content[status];
    if (!currentContent) return null;
    return (<div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-lg"><div className="text-center p-8 bg-white rounded-xl shadow-lg flex flex-col items-center gap-4 w-4/5">{currentContent.icon}<h2 className="text-2xl font-bold text-slate-800">{currentContent.title}</h2><p className="text-slate-600">{currentContent.message}</p><div className="w-full mt-4">{currentContent.buttons}</div></div></div>);
};
const getDifficultyForLevel = (lvl: number): Difficulty => {
  if (lvl > 5) return 'Hard';
  if (lvl > 2) return 'Medium';
  return 'Easy';
};
//========== MAIN APP COMPONENT (메인 게임 컴포넌트) ==========
const App: React.FC = () => {
    // 
    const API_KEY = "gen-lang-client-0051941912";

    const [gameStatus, setGameStatus] = useState<GameStatus>('LOADING');
    const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
    const [boardState, setBoardState] = useState<GridCell[][]>([]);
    const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
    const [wrongInputCell, setWrongInputCell] = useState<CellPosition | null>(null);
    const [preloadedPuzzle, setPreloadedPuzzle] = useState<{ puzzle: Puzzle; difficulty: Difficulty } | null>(null);

    useEffect(() => { const savedHighScore = localStorage.getItem('mathCrosswordHighScore'); if (savedHighScore) { setHighScore(parseInt(savedHighScore, 10)); } }, []);
    useEffect(() => { if (score > highScore) { setHighScore(score); localStorage.setItem('mathCrosswordHighScore', String(score)); } }, [score, highScore]);
    
    const fetchPuzzleFromAI = useCallback(async (difficultyToFetch: Difficulty): Promise<Puzzle> => {
        if (!API_KEY || API_KEY === "YOUR_API_KEY") {
            setGameStatus('ERROR');
            throw new Error("API_KEY is not set. Please add your API key.");
        }
        const ai = new GoogleGenerativeAI(API_KEY);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Create a number puzzle for difficulty: ${difficultyToFetch}. The grid must be 8x8. The puzzle should be a grid with some numbers pre-filled, some empty cells for the user to fill, and some non-playable blank spaces. The numbers can be multi-digit. The grid should be sparse and form an interesting, non-rectangular shape. Use these cell types and values: 'GIVEN': For pre-filled numbers. The 'value' property must be a string containing the number. 'INPUT': For empty cells the user must fill in. The 'value' property must be an empty string "". 'EMPTY': For blank, non-playable spaces. The 'value' property must be an empty string "". The response must be a valid JSON object. The JSON should contain: 'grid': An 8x8 array representing the puzzle board. 'solution': An array of objects for each 'INPUT' cell. Each object must have a 'key' (a "row,col" string) and a 'value' (the correct number). There must be at least 5 INPUT cells. 'keypad': An array of 15 numbers. It must contain all the correct numbers for the solution, plus some distractor numbers. The numbers should be shuffled.`;
        
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const puzzleResponse = JSON.parse(cleanedText);

            if (!puzzleResponse || !Array.isArray(puzzleResponse.grid) || !Array.isArray(puzzleResponse.solution) || !Array.isArray(puzzleResponse.keypad)) { throw new Error("Invalid puzzle format from API"); }
            
            const solutionMap = puzzleResponse.solution.reduce((acc: Record<string, number>, item: { key: string; value: number }) => { acc[item.key] = item.value; return acc; }, {});
            return { grid: puzzleResponse.grid, solution: solutionMap, keypad: puzzleResponse.keypad };
        } catch (error) {
            console.error("Error fetching or parsing puzzle:", error);
            setGameStatus('ERROR');
            throw error;
        }
    }, []);

    const preloadPuzzle = useCallback(async (forLevel: number) => { if (preloadedPuzzle) return; const nextDifficulty = getDifficultyForLevel(forLevel); try { const puzzleData = await fetchPuzzleFromAI(nextDifficulty); setPreloadedPuzzle({ puzzle: puzzleData, difficulty: nextDifficulty }); } catch (error) { console.error("Failed to preload puzzle:", error); } }, [preloadedPuzzle, fetchPuzzleFromAI]);
    const generatePuzzle = useCallback(async (currentDifficulty: Difficulty) => { setGameStatus('LOADING'); setSelectedCell(null); try { const puzzleData = await fetchPuzzleFromAI(currentDifficulty); setPuzzle(puzzleData); setBoardState(puzzleData.grid); setGameStatus('PLAYING'); setMistakes(0); preloadPuzzle(level + 1); } catch (error) { console.error("Failed to generate puzzle:", error); setGameStatus('ERROR'); } }, [level, preloadPuzzle, fetchPuzzleFromAI]);
    const startNewGame = useCallback(() => { const currentDifficulty = getDifficultyForLevel(level); setDifficulty(currentDifficulty); if (preloadedPuzzle && preloadedPuzzle.difficulty === currentDifficulty) { setPuzzle(preloadedPuzzle.puzzle); setBoardState(preloadedPuzzle.puzzle.grid); setGameStatus('PLAYING'); setMistakes(0); setSelectedCell(null); setPreloadedPuzzle(null); preloadPuzzle(level + 1); } else { generatePuzzle(currentDifficulty); } }, [level, preloadedPuzzle, generatePuzzle, preloadPuzzle]);
    
    useEffect(() => { startNewGame(); }, [level]);

    const handleCellClick = (row: number, col: number) => { if (gameStatus !== 'PLAYING') return; const cell = boardState[row][col]; if (cell && cell.type === CellType.INPUT) { setSelectedCell({ row, col }); } else { setSelectedCell(null); } };
    const handleNumberPadClick = (num: number) => {
        if (!selectedCell || gameStatus !== 'PLAYING' || !puzzle) return;
        const { row, col } = selectedCell;
        const solutionKey = `${row},${col}`;
        if (puzzle.solution[solutionKey] === num) {
            const newBoardState = boardState.map(r => r.map(c => ({...c})));
            newBoardState[row][col] = { type: CellType.GIVEN, value: String(num) };
            setBoardState(newBoardState);
            setScore(prev => prev + 10);
            setSelectedCell(null);
            const isWon = Object.keys(puzzle.solution).every(key => { const [r, c] = key.split(',').map(Number); return newBoardState[r][c].type === CellType.GIVEN || newBoardState[r][c].type === CellType.REVEALED; });
            if (isWon) { setGameStatus('WON'); setScore(prev => prev + 100); }
        } else {
            const newMistakes = mistakes + 1;
            setMistakes(newMistakes);
            setWrongInputCell(selectedCell);
            setTimeout(() => setWrongInputCell(null), 300);
            if (newMistakes >= 3) {
                const solutionBoard = boardState.map((r, rowIndex) => r.map((c, colIndex) => { const key = `${rowIndex},${colIndex}`; if (c.type === CellType.INPUT) { return { ...c, value: String(puzzle.solution[key]), type: CellType.REVEALED }; } return c; }));
                setBoardState(solutionBoard);
                setGameStatus('LOST');
            }
        }
    };
    
    const goToNextLevel = () => { setLevel(prev => prev + 1); };
    const startOverFromLevel1 = () => { setScore(0); setLevel(1); };
    const retryLevel = () => { if (!puzzle) { startNewGame(); return; } setBoardState(puzzle.grid); setMistakes(0); setSelectedCell(null); setGameStatus('PLAYING'); };

    return (<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-slate-800"><div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-4"><GameHeader level={level} score={score} highScore={highScore} mistakes={mistakes} maxMistakes={3} onRestart={startNewGame} difficulty={difficulty} /><div className="relative">{(gameStatus === 'LOADING' && (<div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg"><LoadingSpinner /></div>))} {(gameStatus === 'WON' || gameStatus === 'LOST' || gameStatus === 'ERROR') && <GameOverlay status={gameStatus} onNextLevel={goToNextLevel} onRestart={startNewGame} onRetry={retryLevel} onRestartFromLevel1={startOverFromLevel1} difficulty={difficulty}/>}<GameBoard grid={boardState} onCellClick={handleCellClick} selectedCell={selectedCell} wrongInputCell={wrongInputCell} /></div><NumberPad numbers={puzzle?.keypad || []} onNumberClick={handleNumberPadClick} disabled={gameStatus !== 'PLAYING'} /></div><footer className="text-center mt-4 text-xs text-gray-500"><p>Math Crossword Puzzle generated with Gemini</p></footer></div>);
};

//========== RENDER APP (앱 실행) ==========
const rootElement = document.getElementById('root');
if (!rootElement) { throw new Error("Could not find root element to mount to"); }
const root = ReactDOM.createRoot(rootElement);
root.render(<React.StrictMode><App /></React.StrictMode>);


