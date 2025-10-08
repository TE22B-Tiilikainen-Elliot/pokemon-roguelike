// ==========================================
// POKÉMON ROGUELIKE COMBAT PROTOTYPE
// ==========================================

// Game state
const gameState = {
  playerType: '',
  playerTeam: [],
  currentPlayerPokemon: null,
  currentFoePokemon: null,
  nextFoePokemon: null, // preloaded opponent for next battle
  replacementCandidate: null, // holds caught Pokemon awaiting replacement selection
  battleNumber: 1,
  totalBattles: 8,
  catchCooldown: 0,
  isInBattle: false,
  battlePhase: 'select-move', // 'select-move', 'battle-end', 'catch-prompt', 'pokemon-selection', 'replacement-selection'
  messageLog: []
};

// Type effectiveness chart (simplified)
const typeChart = {
  normal: { fighting: 2, ghost: 0 },
  fire: { water: 0.5, grass: 2, fire: 0.5, ice: 2, bug: 2, steel: 2, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass: { water: 2, fire: 0.5, grass: 0.5, poison: 0.5, ground: 2, rock: 2, bug: 0.5, dragon: 0.5, steel: 0.5, flying: 0.5 },
  electric: { water: 2, grass: 0.5, ground: 0, flying: 2, dragon: 0.5, electric: 0.5, steel: 1 },
  ice: { water: 0.5, grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, steel: 0.5, ice: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, ghost: 0, fairy: 0.5 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, dark: 0.5, normal: 0 },
  dragon: { dragon: 2, steel: 0.5, fire: 0.5, water: 0.5, electric: 0.5, grass: 0.5, fairy: 0 },
  dark: { fighting: 0.5, ghost: 2, psychic: 2, dark: 0.5, fairy: 0.5 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 }
};

// Cache for fetched Pokémon data
const pokemonCache = new Map();
const moveCache = new Map();

// Special move mechanics data
const SPECIAL_MOVES = {
  // 2-turn moves (charge moves)
  'solar-beam': { type: 'charge', chargeTurn: 'absorbing sunlight' },
  'razor-wind': { type: 'charge', chargeTurn: 'whipping up a whirlwind' },
  'skull-bash': { type: 'charge', chargeTurn: 'lowering its head' },
  'sky-attack': { type: 'charge', chargeTurn: 'glowing intensely' },
  'fly': { type: 'charge', chargeTurn: 'flying up high' },
  'dig': { type: 'charge', chargeTurn: 'burrowing underground' },
  'dive': { type: 'charge', chargeTurn: 'diving underwater' },
  'bounce': { type: 'charge', chargeTurn: 'springing up' },
  
  // Recoil moves
  'take-down': { type: 'recoil', recoilPercent: 25 },
  'double-edge': { type: 'recoil', recoilPercent: 33 },
  'submission': { type: 'recoil', recoilPercent: 25 },
  'jump-kick': { type: 'recoil', recoilPercent: 50, missRecoil: true },
  'high-jump-kick': { type: 'recoil', recoilPercent: 50, missRecoil: true },
  'volt-tackle': { type: 'recoil', recoilPercent: 33 },
  'flare-blitz': { type: 'recoil', recoilPercent: 33 },
  'brave-bird': { type: 'recoil', recoilPercent: 33 },
  'wood-hammer': { type: 'recoil', recoilPercent: 33 },
  'head-smash': { type: 'recoil', recoilPercent: 50 },
  
  // Multi-hit moves
  'double-slap': { type: 'multi-hit', hits: [2, 5] },
  'comet-punch': { type: 'multi-hit', hits: [2, 5] },
  'fury-attack': { type: 'multi-hit', hits: [2, 5] },
  'pin-missile': { type: 'multi-hit', hits: [2, 5] },
  'spike-cannon': { type: 'multi-hit', hits: [2, 5] },
  'barrage': { type: 'multi-hit', hits: [2, 5] },
  'fury-swipes': { type: 'multi-hit', hits: [2, 5] },
  'bone-rush': { type: 'multi-hit', hits: [2, 5] },
  'double-kick': { type: 'multi-hit', hits: [2, 2] }, // Always hits twice
  'twineedle': { type: 'multi-hit', hits: [2, 2] }
};

// Battle state for 2-turn moves
const battleState = {
  playerChargingMove: null,
  foeChargingMove: null,
  futureSightQueue: [] // { target: 'player'|'foe', turnsRemaining: number, power: number, attacker: { level, specialattack } }
};

// Level and stat assumptions
const DEFAULT_LEVEL = 50; // All Pokemon are level 50
const DEFAULT_IV = 31;
const DEFAULT_EV = 0;
const NATURE_MOD = 1.0; // neutral nature

// BST threshold to define "weaker" Pokémon for starters and early foes
const WEAK_BST_THRESHOLD = 330;
const STARTER_BST_THRESHOLD = 450; // Slightly stronger starters

// Total number of mainline Pokédex entries supported by PokeAPI (approx; includes up to Gen 9)
// Used for random opponent sampling across all generations.
const TOTAL_POKEMON_IDS = 1025;

function getBST(pokemonData) {
  if (!pokemonData || !pokemonData.stats) return 0;
  return pokemonData.stats.reduce((sum, s) => sum + (s.base_stat || 0), 0);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function logMessage(message) {
  gameState.messageLog.push(message);
  const logEl = document.getElementById('message-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = message;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
  
  // Limit log entries
  const entries = logEl.querySelectorAll('.log-entry');
  if (entries.length > 10) {
    entries[0].remove();
  }
}

function clearLog() {
  const logEl = document.getElementById('message-log');
  logEl.innerHTML = '';
  gameState.messageLog = [];
}

function getTypeEffectiveness(attackType, defenderTypes) {
  let effectiveness = 1;
  
  defenderTypes.forEach(defType => {
    const chart = typeChart[attackType];
    if (chart && chart[defType.type.name] !== undefined) {
      effectiveness *= chart[defType.type.name];
    }
  });
  
  return effectiveness;
}

function getEffectivenessText(effectiveness) {
  if (effectiveness === 0) return "It has no effect...";
  if (effectiveness < 1) return "It's not very effective...";
  if (effectiveness > 1) return "It's super effective!";
  return "";
}

function isChargingMove(moveName) {
  const moveData = SPECIAL_MOVES[moveName];
  return moveData && moveData.type === 'charge';
}

function isRecoilMove(moveName) {
  const moveData = SPECIAL_MOVES[moveName];
  return moveData && moveData.type === 'recoil';
}

function isMultiHitMove(moveName) {
  const moveData = SPECIAL_MOVES[moveName];
  return moveData && moveData.type === 'multi-hit';
}

function getMultiHitCount(moveName) {
  const moveData = SPECIAL_MOVES[moveName];
  if (!moveData || moveData.type !== 'multi-hit') return 1;
  
  const [min, max] = moveData.hits;
  if (min === max) return min;
  
  // Weighted distribution: 2 hits (37.5%), 3 hits (37.5%), 4 hits (12.5%), 5 hits (12.5%)
  const rand = Math.random();
  if (rand < 0.375) return min;
  if (rand < 0.75) return min + 1;
  if (rand < 0.875) return max - 1;
  return max;
}

function calculateRecoilDamage(attacker, move, damageDealt) {
  const moveData = SPECIAL_MOVES[move.name];
  if (!moveData || moveData.type !== 'recoil') return 0;
  
  // For moves like Jump Kick that cause recoil on miss
  if (damageDealt === 0 && moveData.missRecoil) {
    return Math.floor(attacker.stats.maxHp / 2); // Half max HP on miss
  }
  
  return Math.floor(damageDealt * (moveData.recoilPercent / 100));
}

async function executeSpecialMove(attacker, defender, move, isPlayer) {
  // Handle charging moves (2-turn moves)
  if (isChargingMove(move.name)) {
    const chargingMoveKey = isPlayer ? 'playerChargingMove' : 'foeChargingMove';
    
    if (!battleState[chargingMoveKey]) {
      // First turn: charge up
      battleState[chargingMoveKey] = move;
      const moveData = SPECIAL_MOVES[move.name];
      logMessage(`${capitalize(attacker.name)} is ${moveData.chargeTurn}!`);
      move.currentPp--; // Use PP on charge turn
      return { damage: 0, charging: true };
    } else {
      // Second turn: execute the move
      battleState[chargingMoveKey] = null;
      // Fall through to normal damage calculation
    }
  }
  
  // Handle unique status moves
  if (move.damage_class && move.damage_class.name === 'status') {
    const name = move.name;
    if (name === 'rest') {
      attacker.stats.currentHp = attacker.stats.maxHp;
      if (!attacker.status) attacker.status = { sleepTurns: 0 };
      attacker.status.sleepTurns = 2; // sleep for two turns
      logMessage(`${capitalize(attacker.name)} used Rest! It fell asleep and restored its health!`);
      return { damage: 0, statusOnly: true };
    }
    if (name === 'future-sight') {
      // Queue a delayed attack that lands after 2 turns
      const targetKey = isPlayer ? 'foe' : 'player';
      const attackerSnapshot = { level: attacker.level, specialattack: attacker.stats.specialattack };
      const power = move.power || 120;
      battleState.futureSightQueue.push({ target: targetKey, turnsRemaining: 2, power, attacker: attackerSnapshot });
      logMessage(`${capitalize(attacker.name)} foresaw an attack!`);
      return { damage: 0, statusOnly: true };
    }
    // Generic status moves not yet implemented fully
    logMessage(`${capitalize(attacker.name)} used ${capitalize(move.name)}!`);
    return { damage: 0, statusOnly: true };
  }

  // Handle multi-hit moves
  if (isMultiHitMove(move.name)) {
    const hitCount = getMultiHitCount(move.name);
    let totalDamage = 0;
    let hitsMade = 0;
    
    for (let i = 0; i < hitCount; i++) {
      const result = calculateDamage(attacker, defender, move);
      if (result.missed && i === 0) {
        // If first hit misses, entire move misses
        logMessage(`${capitalize(attacker.name)} used ${capitalize(move.name)} but it missed!`);
        return { damage: 0, missed: true };
      } else if (!result.missed) {
        totalDamage += result.damage;
        hitsMade++;
      }
    }
    
    if (hitsMade > 0) {
      logMessage(`${capitalize(attacker.name)} used ${capitalize(move.name)} ${hitsMade} time${hitsMade > 1 ? 's' : ''}!`);
      return { damage: totalDamage, hits: hitsMade, effectiveness: calculateDamage(attacker, defender, move).effectiveness };
    }
    
    return { damage: 0, missed: true };
  }
  
  // Normal single-hit move
  const result = calculateDamage(attacker, defender, move);
  return result;
}

// ==========================================
// POKÉMON DATA & API
// ==========================================

async function fetchPokemonData(nameOrId) {
  const cacheKey = nameOrId.toString().toLowerCase();
  if (pokemonCache.has(cacheKey)) {
    return pokemonCache.get(cacheKey);
  }
  
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`);
    if (!response.ok) throw new Error(`Failed to fetch ${nameOrId}`);
    
    const pokemon = await response.json();
    
    // Keep a list of candidate move URLs (we'll build random movesets later)
    pokemon.candidateMoves = pokemon.moves.map(m => m.move.url);
    
    pokemonCache.set(cacheKey, pokemon);
    return pokemon;
  } catch (error) {
    console.error('Failed to fetch pokemon:', error);
    // Return a fallback Pokémon
    return {
      id: 1,
      name: 'missingno',
      types: [{ type: { name: 'normal' } }],
      stats: [
        { base_stat: 45, stat: { name: 'hp' } },
        { base_stat: 49, stat: { name: 'attack' } },
        { base_stat: 49, stat: { name: 'defense' } },
        { base_stat: 65, stat: { name: 'special-attack' } },
        { base_stat: 65, stat: { name: 'special-defense' } },
        { base_stat: 45, stat: { name: 'speed' } }
      ],
      sprites: { front_default: null },
      candidateMoves: []
    };
  }
}

async function getStarterPokemonOfType(type) {
  // Better starter pool (evolved forms and stronger base Pokemon)
  const starterPokemonByType = {
    normal: ['persian', 'raticate', 'fearow', 'furret', 'linoone'],
    fire: ['charmeleon', 'arcanine', 'rapidash', 'flareon', 'camerupt'],
    water: ['wartortle', 'golduck', 'gyarados', 'vaporeon', 'lapras'],
    grass: ['ivysaur', 'gloom', 'weepinbell', 'bayleef', 'grovyle'],
    electric: ['raichu', 'magneton', 'electrode', 'flaaffy', 'manectric'],
    ice: ['dewgong', 'cloyster', 'piloswine', 'glalie'],
    fighting: ['machoke', 'primeape', 'hitmonlee', 'hitmonchan'],
    poison: ['arbok', 'nidorino', 'nidorina', 'muk', 'crobat'],
    ground: ['sandslash', 'dugtrio', 'donphan', 'flygon'],
    flying: ['fearow', 'golbat', 'noctowl', 'skarmory'],
    psychic: ['kadabra', 'slowbro', 'hypno', 'kirlia', 'gardevoir'],
    bug: ['butterfree', 'beedrill', 'scyther', 'pinsir', 'forretress'],
    rock: ['graveler', 'onix', 'rhydon', 'golem'],
    ghost: ['haunter', 'gengar', 'banette'],
    dragon: ['dragonair', 'flygon', 'altaria'],
    dark: ['mightyena', 'houndoom', 'umbreon'],
    steel: ['magneton', 'skarmory', 'metagross'],
    fairy: ['wigglytuff', 'clefable', 'gardevoir']
  };

  const candidates = [...(starterPokemonByType[type] || ['raticate'])];

  // Try to find a Pokémon under the starter BST threshold but above weak threshold
  for (let i = 0; i < Math.min(10, candidates.length * 2); i++) {
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const data = await fetchPokemonData(chosen);
    const bst = getBST(data);
    if (bst <= STARTER_BST_THRESHOLD && bst > WEAK_BST_THRESHOLD && data.types.some(t => t.type.name === type)) {
      return data;
    }
  }

  // Fallback: return the best by BST among candidates of the right type
  let best = null;
  for (const name of candidates) {
    const data = await fetchPokemonData(name);
    if (data.types.some(t => t.type.name === type)) {
      if (!best || getBST(data) > getBST(best)) best = data;
    }
  }
  if (best) return best;

  // As a last resort, use the weak pokemon function
  return await getWeakPokemonOfType(type);
}

async function getWeakPokemonOfType(type) {
  // Candidate pool (early, generally weaker Pokémon). We'll further filter by BST.
  const weakPokemonByType = {
    normal: ['rattata', 'pidgey', 'meowth', 'sentret', 'zigzagoon'],
    fire: ['charmander', 'growlithe', 'vulpix', 'torchic'],
    water: ['squirtle', 'psyduck', 'magikarp', 'poliwag', 'remoraid'],
    grass: ['bulbasaur', 'oddish', 'bellsprout', 'chikorita'],
    electric: ['pikachu', 'magnemite', 'voltorb', 'mareep'],
    ice: ['seel', 'shellder', 'swinub'],
    fighting: ['machop', 'mankey', 'tyrogue'],
    poison: ['ekans', 'nidoran-m', 'nidoran-f', 'grimer'],
    ground: ['sandshrew', 'diglett', 'phanpy'],
    flying: ['spearow', 'hoothoot', 'zubat'],
    psychic: ['abra', 'slowpoke', 'drowzee', 'ralts'],
    bug: ['caterpie', 'weedle', 'wurmple', 'kricketot'],
    rock: ['geodude', 'nosepass'],
    ghost: ['gastly', 'shuppet'],
    dragon: ['dratini'],
    dark: ['poochyena', 'houndour'],
    steel: ['magnemite'],
    fairy: ['jigglypuff', 'clefairy']
  };

  const candidates = [...(weakPokemonByType[type] || ['pidgey'])];

  // Try to find a Pokémon under the BST threshold
  for (let i = 0; i < Math.min(10, candidates.length * 2); i++) {
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const data = await fetchPokemonData(chosen);
    if (getBST(data) <= WEAK_BST_THRESHOLD && data.types.some(t => t.type.name === type)) {
      return data;
    }
  }

  // Fallback: return the weakest by BST among candidates of the right type
  let best = null;
  for (const name of candidates) {
    const data = await fetchPokemonData(name);
    if (data.types.some(t => t.type.name === type)) {
      if (!best || getBST(data) < getBST(best)) best = data;
    }
  }
  if (best) return best;

  // As a last resort, just return a random early Pokémon
  return await fetchPokemonData(candidates[0]);
}

async function fetchRandomOpponentByBST(minBST, maxBST) {
  // Search across all generations (1..TOTAL_POKEMON_IDS)
  let last = null;
  let candidates = [];
  let best = null;
  let bestBST = -1;
  
  const attempts = 60; // more attempts to better meet min threshold
  for (let i = 0; i < attempts; i++) {
    const id = Math.floor(Math.random() * TOTAL_POKEMON_IDS) + 1;
    const data = await fetchPokemonData(id);
    const bst = getBST(data);
    last = data;

    // Track best seen to avoid regressions in difficulty
    if (bst > bestBST) {
      best = data;
      bestBST = bst;
    }
    
    // Collect candidates that meet constraints (maxBST optional)
    const withinMax = (typeof maxBST === 'number') ? (bst <= maxBST) : true;
    if (bst >= minBST && withinMax) {
      candidates.push(data);
    }
  }
  
  // Prefer a candidate meeting the minimum; otherwise use the highest BST seen
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  if (best) return best;
  return last; // Final fallback
}

async function getRandomOpponentPokemon(battleNumber) {
  // Calculate minimum and maximum BST based on battle number for scaling difficulty.
  const baseMinBST = 175; // Very weak Pokemon floor
  const bstIncreasePerBattle = 8; // Slower increase per battle

  const baseMaxBST = 300; // Add a base maximum BST
  const maxBSTIncreasePerBattle = 12; // How much max increases per battle

  const minBST = baseMinBST + (battleNumber - 1) * bstIncreasePerBattle;
  const maxBST = baseMaxBST + (battleNumber - 1) * maxBSTIncreasePerBattle;

  return await fetchRandomOpponentByBST(minBST, maxBST);
}

// ==========================================
// BATTLE SYSTEM
// ==========================================

function computeStatsAtLevel(baseStats, level = DEFAULT_LEVEL) {
  const stats = {};
  baseStats.forEach(statData => {
    const base = statData.base_stat;
    const name = statData.stat.name; // 'hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'
    if (name === 'hp') {
      stats.maxHp = Math.floor(((2 * base + DEFAULT_IV + Math.floor(DEFAULT_EV / 4)) * level) / 100) + level + 10;
      stats.currentHp = stats.maxHp;
    } else {
      const key = name.replace('-', '');
      const raw = Math.floor(((2 * base + DEFAULT_IV + Math.floor(DEFAULT_EV / 4)) * level) / 100) + 5;
      stats[key] = Math.floor(raw * NATURE_MOD);
    }
  });
  return stats;
}

async function fetchMoveDetail(moveUrl) {
  if (moveCache.has(moveUrl)) return moveCache.get(moveUrl);
  try {
    const res = await fetch(moveUrl);
    if (!res.ok) throw new Error('move fetch failed');
    const data = await res.json();
    moveCache.set(moveUrl, data);
    return data;
  } catch (e) {
    console.warn('Failed to fetch move', moveUrl);
    return null;
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function buildRandomMoves(pokemonData) {
  const candidates = Array.isArray(pokemonData.candidateMoves) ? [...pokemonData.candidateMoves] : [];
  shuffle(candidates);

  const stabDamaging = [];
  const damaging = [];
  const status = [];

  for (let i = 0; i < candidates.length; i++) {
    const moveDetail = await fetchMoveDetail(candidates[i]);
    if (!moveDetail || !moveDetail.type || !moveDetail.damage_class) continue;

    const move = {
      name: moveDetail.name,
      power: moveDetail.power || 0,
      accuracy: moveDetail.accuracy,
      pp: moveDetail.pp || 20,
      type: { name: moveDetail.type.name },
      damage_class: { name: moveDetail.damage_class.name },
      currentPp: moveDetail.pp || 20,
      maxPp: moveDetail.pp || 20
    };

    const isDamaging = moveDetail.damage_class.name !== 'status' && (moveDetail.power || 0) > 0;
    const hasSTAB = pokemonData.types && pokemonData.types.some(t => t.type.name === moveDetail.type.name);
    
    if (isDamaging && hasSTAB) stabDamaging.push(move);
    else if (isDamaging) damaging.push(move);
    else status.push(move);

    // Safety cap to avoid too many fetches if we already have enough variety
    if (stabDamaging.length + damaging.length + status.length >= 24) break;
  }

  const picked = [];
  // Ensure at least one STAB damaging move if available
  if (stabDamaging.length > 0) {
    shuffle(stabDamaging);
    picked.push(stabDamaging[0]);
  }

  // Fill remaining slots with a mix of damaging and status moves
  const pool = shuffle([...damaging, ...status, ...stabDamaging.slice(1)]);
  for (let i = 0; i < pool.length && picked.length < 4; i++) {
    // Avoid duplicates by name
    if (!picked.some(m => m.name === pool[i].name)) {
      picked.push(pool[i]);
    }
  }

  if (picked.length === 0) {
    // Fallback basic moveset if nothing found
    picked.push({
      name: 'tackle', power: 40, accuracy: 100, pp: 35, type: { name: 'normal' }, damage_class: { name: 'physical' }, currentPp: 35, maxPp: 35
    });
  }

  // Ensure exactly 4 moves (duplicate some if necessary)
  while (picked.length < 4) {
    picked.push({ ...picked[0], currentPp: picked[0].maxPp });
  }
  return picked.slice(0, 4);
}

async function createPokemonBattleInstance(pokemonData, level = DEFAULT_LEVEL) {
  const stats = computeStatsAtLevel(pokemonData.stats, level);
  const moves = await buildRandomMoves(pokemonData);
  return {
    ...pokemonData,
    level,
    stats,
    moves,
    status: { sleepTurns: 0 },
    isPlayer: false
  };
}

function calculateDamage(attacker, defender, move) {
  const level = attacker.level;
  const power = move.power || 40;
  const accuracy = move.accuracy || 100;
  
  // Miss check
  if (Math.random() * 100 > accuracy) {
    return { damage: 0, missed: true };
  }
  
  // Determine attack and defense stats
  const isPhysical = move.damage_class.name === 'physical';
  const attackStat = isPhysical ? attacker.stats.attack : attacker.stats.specialattack;
  const defenseStat = isPhysical ? defender.stats.defense : defender.stats.specialdefense;
  
  // Base damage calculation (Gen 6+ style)
  const base = Math.floor(
    Math.floor(
      Math.floor((2 * level) / 5 + 2) * power * attackStat / Math.max(1, defenseStat)
    ) / 50
  ) + 2;
  
  // STAB
  const hasSTAB = attacker.types.some(t => t.type.name === move.type.name);
  const stab = hasSTAB ? 1.5 : 1.0;
  
  // Type effectiveness
  const effectiveness = getTypeEffectiveness(move.type.name, defender.types);
  
  // Critical chance ~1/24
  const isCrit = Math.random() < (1 / 24);
  const crit = isCrit ? 1.5 : 1.0;
  
  // Random factor (85-100%)
  const rand = 0.85 + Math.random() * 0.15;
  
  let damage = Math.floor(base * stab * effectiveness * crit * rand);
  
  damage = Math.max(1, damage);
  
  return { damage, effectiveness, missed: false, crit: isCrit, stab: hasSTAB };
}

function getAIMoveChoice(pokemon) {
  const availableMoves = pokemon.moves.filter(move => move.currentPp > 0);
  if (availableMoves.length === 0) {
    // Use Struggle (not implemented, just use first move)
    return pokemon.moves[0];
  }

  // Heuristic: prefer higher power damaging moves; avoid Rest unless HP <= 50%
  const hpRatio = pokemon.stats.currentHp / pokemon.stats.maxHp;
  const scored = availableMoves.map(m => {
    let score = 0;
    const isDamaging = m.damage_class && m.damage_class.name !== 'status' && (m.power || 0) > 0;
    if (m.name === 'rest') {
      score = hpRatio <= 0.5 ? 80 : 5;
    } else if (isDamaging) {
      score = (m.power || 0) * ((m.accuracy || 100) / 100);
    } else {
      score = 20; // generic utility for status moves
    }
    return { move: m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

// ==========================================
// BATTLE FLOW
// ==========================================

async function executeTurn(playerMove, foeMove) {
  const player = gameState.currentPlayerPokemon;
  const foe = gameState.currentFoePokemon;
  
  // Check for 2-turn moves in progress
  const playerChargingMove = battleState.playerChargingMove;
  const foeChargingMove = battleState.foeChargingMove;
  
  // If a Pokémon is charging, use the charging move instead
  const actualPlayerMove = playerChargingMove || playerMove;
  const actualFoeMove = foeChargingMove || foeMove;
  
  // Determine turn order (simplified: just use speed)
  const playerFirst = player.stats.speed >= foe.stats.speed;
  
  const firstAttacker = playerFirst ? player : foe;
  const firstMove = playerFirst ? actualPlayerMove : actualFoeMove;
  const secondAttacker = playerFirst ? foe : player;
  const secondMove = playerFirst ? actualFoeMove : actualPlayerMove;
  const firstDefender = playerFirst ? foe : player;
  const secondDefender = playerFirst ? player : foe;
  const firstIsPlayer = playerFirst;
  const secondIsPlayer = !playerFirst;
  
  // First attack
  const firstAsleep = handleSleepBeforeAction(firstAttacker);
  if (!firstAsleep && firstMove && (firstMove.currentPp > 0 || battleState[firstIsPlayer ? 'playerChargingMove' : 'foeChargingMove'])) {
    // Don't consume PP if continuing a charging move
    if (!battleState[firstIsPlayer ? 'playerChargingMove' : 'foeChargingMove']) {
      firstMove.currentPp--;
    }
    
    const result = await executeSpecialMove(firstAttacker, firstDefender, firstMove, firstIsPlayer);
    
    if (result.charging) {
      // Move is charging, continue to second attacker
    } else if (result.missed) {
      if (!result.hits) {
        logMessage(`${capitalize(firstAttacker.name)} used ${capitalize(firstMove.name)} but it missed!`);
      }
      
      // Handle recoil on miss for moves like Jump Kick
      const recoilDamage = calculateRecoilDamage(firstAttacker, firstMove, 0);
      if (recoilDamage > 0) {
        firstAttacker.stats.currentHp = Math.max(0, firstAttacker.stats.currentHp - recoilDamage);
        logMessage(`${capitalize(firstAttacker.name)} kept going and crashed! It took ${recoilDamage} damage!`);
        if (firstAttacker.stats.currentHp === 0) {
          logMessage(`${capitalize(firstAttacker.name)} fainted!`);
          updateUI();
          return checkBattleEnd();
        }
      }
    } else {
      firstDefender.stats.currentHp = Math.max(0, firstDefender.stats.currentHp - result.damage);
      
      let damageMsg;
      if (result.hits && result.hits > 1) {
        damageMsg = `It dealt ${result.damage} total damage!`;
      } else {
        damageMsg = `${capitalize(firstAttacker.name)} used ${capitalize(firstMove.name)} for ${result.damage} damage!`;
        if (result.crit) damageMsg += ' Critical hit!';
      }
      logMessage(damageMsg);
      
      if (result.effectiveness !== undefined && result.effectiveness !== 1) {
        logMessage(getEffectivenessText(result.effectiveness));
      }
      
      // Handle recoil damage
      const recoilDamage = calculateRecoilDamage(firstAttacker, firstMove, result.damage);
      if (recoilDamage > 0) {
        firstAttacker.stats.currentHp = Math.max(0, firstAttacker.stats.currentHp - recoilDamage);
        logMessage(`${capitalize(firstAttacker.name)} was hurt by recoil! It took ${recoilDamage} damage!`);
      }
      
      if (firstDefender.stats.currentHp === 0) {
        logMessage(`${capitalize(firstDefender.name)} fainted!`);
        updateUI();
        return checkBattleEnd();
      }
      
      if (firstAttacker.stats.currentHp === 0) {
        logMessage(`${capitalize(firstAttacker.name)} fainted from recoil!`);
        updateUI();
        return checkBattleEnd();
      }
    }
  }
  
  // Second attack (if first defender didn't faint)
  const secondAsleep = handleSleepBeforeAction(secondAttacker);
  if (!secondAsleep && secondDefender.stats.currentHp > 0 && secondMove && (secondMove.currentPp > 0 || battleState[secondIsPlayer ? 'playerChargingMove' : 'foeChargingMove'])) {
    // Don't consume PP if continuing a charging move
    if (!battleState[secondIsPlayer ? 'playerChargingMove' : 'foeChargingMove']) {
      secondMove.currentPp--;
    }
    
    const result = await executeSpecialMove(secondAttacker, secondDefender, secondMove, secondIsPlayer);
    
    if (result.charging) {
      // Move is charging, end turn
    } else if (result.missed) {
      if (!result.hits) {
        logMessage(`${capitalize(secondAttacker.name)} used ${capitalize(secondMove.name)} but it missed!`);
      }
      
      // Handle recoil on miss for moves like Jump Kick
      const recoilDamage = calculateRecoilDamage(secondAttacker, secondMove, 0);
      if (recoilDamage > 0) {
        secondAttacker.stats.currentHp = Math.max(0, secondAttacker.stats.currentHp - recoilDamage);
        logMessage(`${capitalize(secondAttacker.name)} kept going and crashed! It took ${recoilDamage} damage!`);
        if (secondAttacker.stats.currentHp === 0) {
          logMessage(`${capitalize(secondAttacker.name)} fainted!`);
          updateUI();
          return checkBattleEnd();
        }
      }
    } else {
      secondDefender.stats.currentHp = Math.max(0, secondDefender.stats.currentHp - result.damage);
      
      let damageMsg;
      if (result.hits && result.hits > 1) {
        damageMsg = `It dealt ${result.damage} total damage!`;
      } else {
        damageMsg = `${capitalize(secondAttacker.name)} used ${capitalize(secondMove.name)} for ${result.damage} damage!`;
        if (result.crit) damageMsg += ' Critical hit!';
      }
      logMessage(damageMsg);
      
      if (result.effectiveness !== undefined && result.effectiveness !== 1) {
        logMessage(getEffectivenessText(result.effectiveness));
      }
      
      // Handle recoil damage
      const recoilDamage = calculateRecoilDamage(secondAttacker, secondMove, result.damage);
      if (recoilDamage > 0) {
        secondAttacker.stats.currentHp = Math.max(0, secondAttacker.stats.currentHp - recoilDamage);
        logMessage(`${capitalize(secondAttacker.name)} was hurt by recoil! It took ${recoilDamage} damage!`);
      }
      
      if (secondDefender.stats.currentHp === 0) {
        logMessage(`${capitalize(secondDefender.name)} fainted!`);
        updateUI();
        return checkBattleEnd();
      }
      
      if (secondAttacker.stats.currentHp === 0) {
        logMessage(`${capitalize(secondAttacker.name)} fainted from recoil!`);
        updateUI();
        return checkBattleEnd();
      }
    }
  }
  
  // End of turn effects (e.g., Future Sight)
  const endResult = processEndOfTurnEffects();
  if (endResult) return endResult;

  updateUI();
  return null; // Continue battle
}

function checkBattleEnd() {
  const player = gameState.currentPlayerPokemon;
  const foe = gameState.currentFoePokemon;
  
  if (player.stats.currentHp === 0) {
    // Player Pokémon fainted
    const alivePokemon = gameState.playerTeam.filter(p => p.stats.currentHp > 0);
    
    if (alivePokemon.length === 0) {
      // Game over
      return 'game-over';
    } else if (alivePokemon.length === 1) {
      // Only one Pokemon left, automatically switch
      gameState.currentPlayerPokemon = alivePokemon[0];
      logMessage(`Go, ${capitalize(gameState.currentPlayerPokemon.name)}!`);
      updateUI();
      return null; // Continue battle
    } else {
      // Multiple Pokemon available, let player choose via the Team side panel
      gameState.battlePhase = 'pokemon-selection';
      try {
        const movesEl = document.getElementById('move-buttons');
        if (movesEl) movesEl.style.display = 'none';
      } catch (e) {}
      logMessage('Choose your next Pokémon from the Your Team panel.');
      updateUI();
      return 'pokemon-selection'; // Await user to click a team member
    }
  } else if (foe.stats.currentHp === 0) {
    // Player won the battle
    return 'player-won';
  }
  
  return null; // Battle continues
}

// ==========================================
// UI MANAGEMENT
// ==========================================

function updateUI() {
  updateBattleInfo();
  updateTeamDisplay();
  updateMoveButtons();
  updateTopBar();
}

function updateBattleInfo() {
  const player = gameState.currentPlayerPokemon;
  const foe = gameState.currentFoePokemon;
  
  if (player) {
    document.getElementById('player-name').textContent = capitalize(player.name);
    document.getElementById('player-types').textContent = player.types.map(t => capitalize(t.type.name)).join(', ');
    document.getElementById('player-hp-text').textContent = `${player.stats.currentHp}/${player.stats.maxHp}`;
    
    const hpPercent = (player.stats.currentHp / player.stats.maxHp) * 100;
    const hpFill = document.getElementById('player-hp-fill');
    hpFill.style.width = `${hpPercent}%`;
    hpFill.className = 'fill';
    if (hpPercent < 25) hpFill.className += ' critical';
    else if (hpPercent < 50) hpFill.className += ' low';
    
    const playerSprite = document.getElementById('player-sprite');
    if (player.sprites.back_default) {
      playerSprite.style.backgroundImage = `url(${player.sprites.back_default})`;
    } else if (player.sprites.front_default) {
      playerSprite.style.backgroundImage = `url(${player.sprites.front_default})`;
    }
  }
  
  if (foe) {
    document.getElementById('foe-name').textContent = capitalize(foe.name);
    document.getElementById('foe-types').textContent = foe.types.map(t => capitalize(t.type.name)).join(', ');
    document.getElementById('foe-hp-text').textContent = `${foe.stats.currentHp}/${foe.stats.maxHp}`;
    
    const hpPercent = (foe.stats.currentHp / foe.stats.maxHp) * 100;
    const hpFill = document.getElementById('foe-hp-fill');
    hpFill.style.width = `${hpPercent}%`;
    hpFill.className = 'fill';
    if (hpPercent < 25) hpFill.className += ' critical';
    else if (hpPercent < 50) hpFill.className += ' low';
    
    const foeSprite = document.getElementById('foe-sprite');
    if (foe.sprites.front_default) {
      foeSprite.style.backgroundImage = `url(${foe.sprites.front_default})`;
    }
  }
}

function updateTeamDisplay() {
  const teamList = document.getElementById('team-list');
  teamList.innerHTML = '';
  
  gameState.playerTeam.forEach((pokemon, index) => {
    const memberEl = document.createElement('div');
    memberEl.className = 'team-member';
    if (pokemon === gameState.currentPlayerPokemon) memberEl.className += ' active';
    if (pokemon.stats.currentHp === 0) memberEl.className += ' fainted';
    
    const spriteEl = document.createElement('div');
    spriteEl.className = 'sprite';
    if (pokemon.sprites.front_default) {
      spriteEl.style.backgroundImage = `url(${pokemon.sprites.front_default})`;
    }
    
    const infoEl = document.createElement('div');
    infoEl.className = 'info';
    
    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = capitalize(pokemon.name);
    
    const typesEl = document.createElement('div');
    typesEl.className = 'types';
    typesEl.textContent = pokemon.types.map(t => capitalize(t.type.name)).join(', ');
    
    const hpBarEl = document.createElement('div');
    hpBarEl.className = 'hpbar';
    const hpFillEl = document.createElement('div');
    const hpPercent = (pokemon.stats.currentHp / pokemon.stats.maxHp) * 100;
    hpFillEl.className = 'fill';
    hpFillEl.style.width = `${hpPercent}%`;
    if (hpPercent < 25) hpFillEl.className += ' critical';
    else if (hpPercent < 50) hpFillEl.className += ' low';
    hpBarEl.appendChild(hpFillEl);
    
    const hpTextEl = document.createElement('div');
    hpTextEl.className = 'hp-text';
    hpTextEl.textContent = `${pokemon.stats.currentHp}/${pokemon.stats.maxHp}`;
    
    infoEl.appendChild(nameEl);
    infoEl.appendChild(typesEl);
    infoEl.appendChild(hpBarEl);
    infoEl.appendChild(hpTextEl);
    
    memberEl.appendChild(spriteEl);
    memberEl.appendChild(infoEl);
    
    // Add click handler for switching or replacement
    if (pokemon.stats.currentHp > 0) {
      const canSelectSwitch = gameState.battlePhase === 'pokemon-selection' || 
                       (pokemon !== gameState.currentPlayerPokemon && gameState.battlePhase === 'select-move');
      const canSelectReplacement = gameState.battlePhase === 'replacement-selection';
      
      if (canSelectSwitch || canSelectReplacement) {
        memberEl.classList.add('clickable');
        if (gameState.battlePhase === 'pokemon-selection' || gameState.battlePhase === 'replacement-selection') {
          memberEl.classList.add('selection-available');
        }
        memberEl.addEventListener('click', () => {
          if (gameState.battlePhase === 'replacement-selection') {
            handleReplacementViaPanel(index);
          } else {
            handleSwitchDuringTurn(pokemon);
          }
        });
      }
    }
    
    teamList.appendChild(memberEl);
  });
}

function updateMoveButtons() {
  const movesEl = document.getElementById('move-buttons');
  movesEl.innerHTML = '';
  
  if (!gameState.currentPlayerPokemon || gameState.battlePhase !== 'select-move') {
    return;
  }
  
  gameState.currentPlayerPokemon.moves.forEach(move => {
    const btnEl = document.createElement('button');
    btnEl.className = 'move-btn';
    if (move.currentPp === 0) btnEl.disabled = true;
    
    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = capitalize(move.name);
    
    const detailsEl = document.createElement('div');
    detailsEl.className = 'details';
    detailsEl.innerHTML = `
      <span class="type type-${move.type.name}">${capitalize(move.type.name)}</span> | 
      Power: ${move.power || '-'} | 
      <span class="pp">PP: ${move.currentPp}/${move.maxPp}</span>
    `;
    
    btnEl.appendChild(nameEl);
    btnEl.appendChild(detailsEl);
    
    btnEl.addEventListener('click', () => handleMoveSelection(move));
    
    movesEl.appendChild(btnEl);
  });
}

function updateTopBar() {
  document.getElementById('battle-number').textContent = gameState.battleNumber;
  // No longer showing total battles since it's infinite
  document.getElementById('catch-cooldown').textContent = gameState.catchCooldown;
}

// ==========================================
// STATUS & END-OF-TURN HELPERS
// ==========================================

function handleSleepBeforeAction(pokemon) {
  if (pokemon.status && pokemon.status.sleepTurns && pokemon.status.sleepTurns > 0) {
    logMessage(`${capitalize(pokemon.name)} is fast asleep!`);
    pokemon.status.sleepTurns--;
    if (pokemon.status.sleepTurns === 0) {
      logMessage(`${capitalize(pokemon.name)} woke up!`);
    }
    return true; // cannot act this turn
  }
  return false;
}

function processEndOfTurnEffects() {
  // Process Future Sight queue
  if (battleState.futureSightQueue.length > 0) {
    battleState.futureSightQueue.forEach(fs => fs.turnsRemaining--);
    const toApply = battleState.futureSightQueue.filter(fs => fs.turnsRemaining <= 0);
    battleState.futureSightQueue = battleState.futureSightQueue.filter(fs => fs.turnsRemaining > 0);

    for (const fs of toApply) {
      const target = fs.target === 'player' ? gameState.currentPlayerPokemon : gameState.currentFoePokemon;
      if (!target || target.stats.currentHp === 0) continue;
      // Calculate damage similar to normal but without STAB and without type effectiveness
      const level = fs.attacker.level;
      const power = fs.power;
      const attackStat = fs.attacker.specialattack;
      const defenseStat = target.stats.specialdefense;
      const base = Math.floor(Math.floor(Math.floor((2 * level) / 5 + 2) * power * attackStat / Math.max(1, defenseStat)) / 50) + 2;
      const rand = 0.85 + Math.random() * 0.15;
      const damage = Math.max(1, Math.floor(base * rand));

      target.stats.currentHp = Math.max(0, target.stats.currentHp - damage);
      logMessage(`Future Sight struck ${capitalize(target.name)} for ${damage} damage!`);
      if (target.stats.currentHp === 0) {
        logMessage(`${capitalize(target.name)} fainted!`);
        updateUI();
        return checkBattleEnd();
      }
    }
  }
  return null;
}

// ==========================================
// POKEMON SELECTION SYSTEM
// ==========================================

// Pokemon selection now handled directly through the team side panel
// No separate overlay needed

// ==========================================
// REPLACEMENT VIA TEAM PANEL
// ==========================================

function handleReplacementViaPanel(replaceIndex) {
  if (gameState.battlePhase !== 'replacement-selection' || !gameState.replacementCandidate) return;
  const caughtPokemon = gameState.replacementCandidate;
  const replacedPokemon = gameState.playerTeam[replaceIndex];
  logMessage(`You released ${capitalize(replacedPokemon.name)} to make room for ${capitalize(caughtPokemon.name)}!`);
  
  // Replace the Pokemon in the team
  gameState.playerTeam[replaceIndex] = caughtPokemon;

  // If the replaced Pokemon was the current one (edge case between battles), set a safe current
  if (gameState.currentPlayerPokemon === replacedPokemon) {
    gameState.currentPlayerPokemon = caughtPokemon;
  }

  // Clear state and proceed
  gameState.replacementCandidate = null;
  gameState.battlePhase = 'select-move';
  try {
    const movesEl = document.getElementById('move-buttons');
    if (movesEl) movesEl.style.display = 'grid';
  } catch (e) {}

  // Immediately proceed to the next battle after replacement
  nextBattle();
}

// ==========================================
// EVENT HANDLERS
// ==========================================

async function handleSwitchDuringTurn(targetPokemon) {
  if (!targetPokemon || targetPokemon === gameState.currentPlayerPokemon || targetPokemon.stats.currentHp === 0) return;
  
  const current = gameState.currentPlayerPokemon;
  const wasFainted = current.stats.currentHp === 0;

  // Perform the switch
  gameState.currentPlayerPokemon = targetPokemon;
  logMessage(`You switched to ${capitalize(targetPokemon.name)}!`);
  updateUI();

  // If this switch is in response to a faint, do NOT consume a turn; restore move selection
  if (wasFainted || gameState.battlePhase === 'pokemon-selection') {
    try {
      const sel = document.getElementById('pokemon-selection');
      if (sel) sel.classList.add('hidden');
      const movesEl = document.getElementById('move-buttons');
      if (movesEl) movesEl.style.display = 'grid';
    } catch (e) {}
    gameState.battlePhase = 'select-move';
    updateMoveButtons();
    return;
  }

  // If the switch was voluntary (not after a faint), it consumes your turn
  if (!wasFainted && gameState.battlePhase === 'select-move') {
    gameState.battlePhase = 'executing';
    const foe = gameState.currentFoePokemon;
    const foeMove = getAIMoveChoice(foe);
    if (foeMove && foeMove.currentPp > 0) {
      foeMove.currentPp--;
      const result = calculateDamage(foe, gameState.currentPlayerPokemon, foeMove);
      if (result.missed) {
        logMessage(`${capitalize(foe.name)} used ${capitalize(foeMove.name)} but it missed!`);
      } else {
        gameState.currentPlayerPokemon.stats.currentHp = Math.max(0, gameState.currentPlayerPokemon.stats.currentHp - result.damage);
        let damageMsg = `${capitalize(foe.name)} used ${capitalize(foeMove.name)} for ${result.damage} damage!`;
        if (result.crit) damageMsg += ' Critical hit!';
        logMessage(damageMsg);
        if (result.effectiveness !== 1) {
          logMessage(getEffectivenessText(result.effectiveness));
        }
      }
    }
    updateUI();
    const battleResult = checkBattleEnd();
    if (battleResult === 'game-over') {
      showEndScreen('Defeat', 'All your Pokémon have fainted. Better luck next time!');
      return;
    } else if (battleResult === 'player-won') {
      gameState.battlePhase = 'battle-end';
      showPostBattleOptions();
      return;
    }
    gameState.battlePhase = 'select-move';
    updateMoveButtons();
  }
}

async function handleMoveSelection(playerMove) {
  if (gameState.battlePhase !== 'select-move') return;
  
  // Disable move buttons during execution
  gameState.battlePhase = 'executing';
  updateMoveButtons();
  
  // AI selects move
  const foeMove = getAIMoveChoice(gameState.currentFoePokemon);
  
  // Execute turn
  const battleResult = await executeTurn(playerMove, foeMove);
  
  if (battleResult === 'game-over') {
    showEndScreen('Defeat', 'All your Pokémon have fainted. Better luck next time!');
  } else if (battleResult === 'player-won') {
    gameState.battlePhase = 'battle-end';
    showPostBattleOptions();
  } else if (battleResult === 'pokemon-selection') {
    // Pokemon selection is handled in checkBattleEnd, nothing more to do
  } else {
    // Battle continues
    gameState.battlePhase = 'select-move';
    updateMoveButtons();
  }
}

function showPostBattleOptions() {
  document.getElementById('move-buttons').style.display = 'none';
  document.getElementById('post-battle').classList.remove('hidden');
  
  // Show catch option if not on cooldown
  if (gameState.catchCooldown === 0) {
    document.getElementById('catch-offer').classList.remove('hidden');
  } else {
    document.getElementById('next-battle').classList.remove('hidden');
  }
}

function handleCatch(shouldCatch) {
  document.getElementById('catch-offer').classList.add('hidden');
  
  if (shouldCatch) {
    const caughtPokemon = gameState.currentFoePokemon;
    caughtPokemon.stats.currentHp = Math.floor(caughtPokemon.stats.maxHp * 0.5); // Heal partially
    gameState.catchCooldown = 3;
    
    if (gameState.playerTeam.length < 6) {
      // Team has space, add directly
      gameState.playerTeam.push(caughtPokemon);
      logMessage(`You caught ${capitalize(caughtPokemon.name)}!`);
      // Immediately proceed to the next battle after catching
      nextBattle();
      return;
    } else {
      // Team is full, choose replacement via side panel
      logMessage(`You caught ${capitalize(caughtPokemon.name)}, but your team is full! Choose a Pokémon to replace from the Your Team panel.`);
      gameState.replacementCandidate = caughtPokemon;
      gameState.battlePhase = 'replacement-selection';
      try {
        const movesEl = document.getElementById('move-buttons');
        if (movesEl) movesEl.style.display = 'none';
      } catch (e) {}
      updateUI();
      return;
    }
  }
  
  // If not catching, allow manual proceed
  document.getElementById('next-battle').classList.remove('hidden');
  updateUI();
}

async function nextBattle() {
  gameState.battleNumber++;
  
  // Decrease catch cooldown
  if (gameState.catchCooldown > 0) {
    gameState.catchCooldown--;
  }
  
  // Remove battle limit - allow infinite battles
  // if (gameState.battleNumber > gameState.totalBattles) {
  //   showEndScreen('Victory!', `Congratulations! You completed all ${gameState.totalBattles} battles!`);
  //   return;
  // }
  
  // Reset UI
  document.getElementById('post-battle').classList.add('hidden');
  document.getElementById('move-buttons').style.display = 'grid';
  clearLog();
  
  // Reset charging move states and Future Sight queue
  battleState.playerChargingMove = null;
  battleState.foeChargingMove = null;
  battleState.futureSightQueue = [];

  // Heal the entire team between battles
  gameState.playerTeam.forEach(p => {
    p.stats.currentHp = p.stats.maxHp;
    // Restore all PP to maximum
    p.moves.forEach(move => {
      move.currentPp = move.maxPp;
    });
  });
  logMessage('Your team was fully healed and all PP was restored!');
  
  // Generate new opponent (use preloaded if available)
  logMessage('A wild Pokémon appeared!');
  if (gameState.nextFoePokemon) {
    gameState.currentFoePokemon = gameState.nextFoePokemon;
    gameState.nextFoePokemon = null;
  } else {
    gameState.currentFoePokemon = await createPokemonBattleInstance(
      await getRandomOpponentPokemon(gameState.battleNumber),
      DEFAULT_LEVEL
    );
  }
  
  // Preload the following opponent in the background
  preloadNextOpponent();
  
  gameState.battlePhase = 'select-move';
  updateUI();
}

function showEndScreen(title, message) {
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-detail').textContent = message;
  document.getElementById('end-screen').classList.remove('hidden');
}

function restartGame() {
  // Reset game state
  Object.assign(gameState, {
    playerType: '',
    playerTeam: [],
    currentPlayerPokemon: null,
    currentFoePokemon: null,
    nextFoePokemon: null,
    replacementCandidate: null,
    battleNumber: 1,
    totalBattles: 8,
    catchCooldown: 0,
    isInBattle: false,
    battlePhase: 'select-move',
    messageLog: []
  });
  
  // Reset charging move states and Future Sight queue
  battleState.playerChargingMove = null;
  battleState.foeChargingMove = null;
  battleState.futureSightQueue = [];
  
  // Show start screen
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}

// ==========================================
// PRELOADING NEXT OPPONENT & ASSETS
// ==========================================

function preloadPokemonAssets(pokemon) {
  if (!pokemon || !pokemon.sprites) return;
  const urls = [];
  if (pokemon.sprites.front_default) urls.push(pokemon.sprites.front_default);
  if (pokemon.sprites.back_default) urls.push(pokemon.sprites.back_default);
  urls.forEach(u => {
    try {
      const img = new Image();
      img.src = u;
    } catch (e) {
      // Ignore if Image is not available (e.g., in non-browser environments)
    }
  });
}

function preloadNextOpponent() {
  const nextBattleNumber = gameState.battleNumber + 1;
  // Fire-and-forget: prepare the next foe in background
  getRandomOpponentPokemon(nextBattleNumber)
    .then(data => createPokemonBattleInstance(data, DEFAULT_LEVEL))
    .then(instance => {
      gameState.nextFoePokemon = instance;
      preloadPokemonAssets(instance);
    })
    .catch(err => console.warn('Preload next opponent failed:', err));
}

// ==========================================
// GAME INITIALIZATION
// ==========================================

async function startGame() {
  const typeSelect = document.getElementById('type-select');
  gameState.playerType = typeSelect.value;
  
  // Hide start screen, show game screen
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  
  // Initialize player team with a stronger starter Pokémon of chosen type
  logMessage('Loading your first Pokémon...');
  const starterData = await getStarterPokemonOfType(gameState.playerType);
  const starterPokemon = await createPokemonBattleInstance(starterData, DEFAULT_LEVEL);
  starterPokemon.isPlayer = true;
  
  gameState.playerTeam = [starterPokemon];
  gameState.currentPlayerPokemon = starterPokemon;
  
  // Generate first opponent
  logMessage('A wild Pokémon appeared!');
  gameState.currentFoePokemon = await createPokemonBattleInstance(
    await getRandomOpponentPokemon(gameState.battleNumber),
    DEFAULT_LEVEL
  );
  
  // Begin preloading the next opponent during the current battle
  preloadNextOpponent();
  
  gameState.isInBattle = true;
  gameState.battlePhase = 'select-move';
  
  updateUI();
  logMessage(`Go, ${capitalize(starterPokemon.name)}!`);
}

// ==========================================
// EVENT LISTENERS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Start button
  document.getElementById('start-btn').addEventListener('click', startGame);
  
  // Catch buttons
  document.getElementById('catch-yes').addEventListener('click', () => handleCatch(true));
  document.getElementById('catch-no').addEventListener('click', () => handleCatch(false));
  
  // Next battle button
  document.getElementById('next-battle').addEventListener('click', nextBattle);
  
  // Restart button
  document.getElementById('restart-btn').addEventListener('click', restartGame);
});
