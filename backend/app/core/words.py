import random
import os
from typing import List, Dict
from ..config import settings


class WordManager:
    """Manages word selection and difficulty levels for the drawing game"""
    
    def __init__(self):
        self.words_by_difficulty = {
            "easy": [
                "cat", "dog", "house", "tree", "sun", "moon", "star", "flower", "bird", "fish",
                "car", "boat", "plane", "train", "bike", "chair", "table", "book", "phone", "computer",
                "apple", "banana", "orange", "pizza", "hamburger", "ice cream", "cake", "bread", "milk", "water"
            ],
            "medium": [
                "elephant", "giraffe", "penguin", "dolphin", "butterfly", "dragon", "castle", "bridge", "mountain", "ocean",
                "forest", "desert", "volcano", "waterfall", "rainbow", "thunder", "lightning", "snow", "rain", "wind",
                "robot", "spaceship", "rocket", "submarine", "helicopter", "skyscraper", "lighthouse", "windmill", "telescope", "microscope"
            ],
            "hard": [
                "phoenix", "unicorn", "centaur", "mermaid", "vampire", "werewolf", "ghost", "zombie", "alien", "cyborg",
                "time machine", "teleporter", "hologram", "laser", "quantum", "black hole", "galaxy", "nebula", "asteroid", "meteor",
                "pyramid", "colosseum", "parthenon", "taj mahal", "great wall", "eiffel tower", "statue of liberty", "big ben", "sydney opera house", "petronas towers"
            ]
        }
        self.load_custom_words()
    
    def load_custom_words(self):
        """Load custom words from file if it exists"""
        if os.path.exists(settings.WORDS_FILE):
            try:
                with open(settings.WORDS_FILE, 'r') as f:
                    custom_words = [word.strip().lower() for word in f.readlines() if word.strip()]
                    # Distribute custom words across difficulties
                    chunk_size = len(custom_words) // 3
                    self.words_by_difficulty["easy"].extend(custom_words[:chunk_size])
                    self.words_by_difficulty["medium"].extend(custom_words[chunk_size:2*chunk_size])
                    self.words_by_difficulty["hard"].extend(custom_words[2*chunk_size:])
            except Exception as e:
                print(f"Error loading custom words: {e}")
    
    def get_random_word(self, difficulty: str = "medium") -> str:
        """Get a random word of specified difficulty"""
        if difficulty not in self.words_by_difficulty:
            difficulty = "medium"
        
        words = self.words_by_difficulty[difficulty]
        return random.choice(words)
    
    def get_word_by_difficulty(self, difficulty: str) -> str:
        """Get a word of specific difficulty"""
        return self.get_random_word(difficulty)
    
    def get_all_words(self) -> Dict[str, List[str]]:
        """Get all words organized by difficulty"""
        return self.words_by_difficulty.copy()
    
    def add_custom_word(self, word: str, difficulty: str = "medium"):
        """Add a custom word to the specified difficulty level"""
        if difficulty not in self.words_by_difficulty:
            difficulty = "medium"
        
        word = word.strip().lower()
        if word and word not in self.words_by_difficulty[difficulty]:
            self.words_by_difficulty[difficulty].append(word)
    
    def get_word_count(self) -> Dict[str, int]:
        """Get the count of words in each difficulty level"""
        return {difficulty: len(words) for difficulty, words in self.words_by_difficulty.items()}


# Global word manager instance
word_manager = WordManager() 