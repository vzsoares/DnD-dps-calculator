// @ts-nocheck
//--------------------------------//
//--- CLASS ATTACK DESCRIPTION ---//
//--------------------------------//
/*
    This class is used to instantiate Attack objects,
    which represent instances of D&D 5e weapon attacks.
    These objects can be used to store data and perform
    statistical analysis about these weapons attacks such
    as calculating the average damage per round.
*/

class Attack {
  name: string;                 // custom name for the attack
  attack_bonus: number;         // attack roll bonus, also known as hit/dc
  damage_bonus: number;         // damage roll bonus, for example bonus for strength or magic items.
  damage_dice: DiceSet;         // array of die, for example 2d6 for a greatsword.
  crit_dice: DiceSet;           // array of die for when attack is critical hit, for example 4d6 for a greatsword plus 6d8 for divine smite used only when attack is a crit
  advantage_modifier: number;   // 1 for normal, 2 for advantage and 3 for elven accuracy
  gwmsharp: boolean;            // 0 for no, 1 for yes. adds plus 10 to damage bonus, and reduces 5 from attack bonus.
  crit_range: number;           // 20 for crit on 20 only. 19 for crit range of 19-20.
  target_AC: number;            // target's armor class.

  constructor(
    name: string,               
    attack_bonus: number,      
    damage_bonus: number,      
    damage_dice: DiceSet, 
    crit_dice: DiceSet, 
    advantage_modifier: number, 
    gwmsharp: boolean, 
    crit_range: number, 
    target_AC: number
  ) {
    this.name = name;
    this.attack_bonus = attack_bonus;
    this.damage_bonus = damage_bonus;
    this.damage_dice = damage_dice;
    this.crit_dice = crit_dice;
    this.advantage_modifier = advantage_modifier;
    this.gwmsharp = gwmsharp;
    this.crit_range = crit_range;
    this.target_AC = target_AC;
  }

  // Calculates the effective attack bonus to account for great weapon master (or sharpshooter).
  getEffectiveAttackBonus() {
    if (this.gwmsharp == true) {
      return this.attack_bonus - 5;
    }
    return this.attack_bonus;
  }

  // Calculates the effective damage bonus to account for great weapon master (or sharpshooter).
  getEffectiveDamageBonus() {
    if (this.gwmsharp == true) {
      return this.damage_bonus + 10;
    }
    return this.damage_bonus;
  }

  // Returns the average damage from dice only ACCOUNTING FOR CHANCE TO HIT.
  // For example, if your chance to hit is 65% and you are attacking with a greatsword with advantage,
  // your average damage will be (1 - (1 - 0.65) ^ 2) * (2 * 3.5) = 6.1425 
  getAverageFromDice() {
    return (
      p_hit(
        this.target_AC,
        this.getEffectiveAttackBonus(),
        this.advantage_modifier
      ) * new DiceSet(this.damage_dice).getAverageRolls()
    );
  }

  // Calculates the average damage from bonus only, ACCOUNTING FOR CHANCE TO HIT.
  // For example if chance to hit is 65% and you have a damage bonus of 5 and you are attacking with elven accuracy,
  // your damage will be (1 - (1 - 0.65) ^ 3) * 5 = 4.785625
  getAverageFromBonus() {
    return (
      p_hit(
        this.target_AC,
        this.getEffectiveAttackBonus(),
        this.advantage_modifier
      ) * this.getEffectiveDamageBonus()
    );
  }

  // Returns the average damage PER TURN derived from critical hits. 
  // THIS IS NOT A CALCULATION OF THE AVERAGE DAMAGE DEALT BY A CRITICAL HIT.
  // For example if chance to hit is 65%, you are attacking with a greatsword, you have advantage, 
  // you crit on 19-20, and you use 3rd level smite only on crits.
  // Your chance to crit will then be 1 - (1 - 0.10) ^ 2 = 0.19 = 19%
  // To find the damage you multiply the chance to crit by all the EXTRA DAMAGE that you would get from the attack.
  // the EXTRA DAMAGE of this attack would be (2 * 3.5 + 6 * 4.5) = 34
  // The final result returned will then be 0.19 * 34 = 6.46
  getAverageFromCritFactor() {
    return (
      p_crit(this.crit_range, this.advantage_modifier) *
      (new DiceSet(this.crit_dice).getAverageRolls() -
        new DiceSet(this.damage_dice).getAverageRolls())
    );
  }

  // Returns the average damage dealt by the attack accounting for average dice rolls, bonus, critical hits, and change to hit
  getAverageTotal() {
    return (
      this.getAverageFromDice() +
      this.getAverageFromBonus() +
      this.getAverageFromCritFactor()
    );
  }
}

//--------------------------------//
//--- CLASS ATTACK DESCRIPTION ---//
//--------------------------------//
/*
    This class is used to instantiate DieRoll objects,
    which represent a single dice roll with along with
    modifiers for rerolling and minimum rolls.
    NOTE: Rerolling more than once is not supported.
*/

class Die {
  sides: number;
  reroll: number;
  minRoll: number;
  constructor(sides: number, reroll: number = 0, minRoll: number = 1) {
    this.sides = sides;
    this.reroll = reroll;
    this.minRoll = minRoll;
  }

  // Returns the average roll for a die
  // given its number of sides, minimum value to reroll ONCE, and minimum roll.
  getAverageRoll(): number {
    if (this.reroll == 0) {
      return (T(this.sides) + T(this.minRoll - 1)) / this.sides;
    } else if (this.reroll > this.minRoll)
      return (
        (T(this.sides) +
          T(this.minRoll - 1) -
          this.reroll * this.minRoll -
          T(this.minRoll) +
          this.reroll * new Die(this.sides, 0, this.minRoll).getAverageRoll()) /
        this.sides
      );
    else this.reroll <= this.minRoll;
    return (
      (T(this.sides) +
        T(this.minRoll - 1) -
        this.reroll * this.minRoll +
        this.reroll * new Die(this.sides, 0, this.minRoll).getAverageRoll()) /
      this.sides
    );
  }
  getSides(): number {
    return this.sides;
  }
}

class DiceSet {
  dice: Die[];

  constructor(
    dice: { sides: number; reroll: number; minRoll: number; id: number }[]
  ) {
    this.dice = [];
    for (let i = 0; i < dice.length; i++) {
      this.dice.push(new Die(dice[i].sides, dice[i].reroll, dice[i].minRoll));
    }
  }

  getAverageRolls(): number {
    let total = 0;
    for (let i = 0; i < this.dice.length; i++) {
      total += this.dice[i].getAverageRoll();
    }
    return total;
  }

  getDie(N: number): Die {
    return this.dice[N];
  }

  addDie(die: Die): void {
    this.dice.push(die);
  }

  length() {
    return this.dice.length;
  }
}

//------------------------//
//--- HELPER FUNCTIONS ---//
//------------------------//

function calculateDefaultCritDice(diceset: DiceSet): DiceSet {
  let dice: number[] = [];
  for (let i = 0; i < diceset.length() * 2; i++) {
    dice.push(diceset.getDie(i % diceset.length()).getSides());
  }
  return new DiceSet(dice);
}

// Returns the triangular number, T(N) = 1 + 2 + 3 + ... + N
function T(N: number) {
  return (N ** 2 + N) / 2;
}

// Returns the probability to hit an attack
// given the target's armor class, the attacker's attack bonus,
// and the attack's advantage modifier.
function p_hit(A: number, B: number, M = 1): number {
  if (A >= B + 20) return 1 - (1 - 0.05) ** M;
  else if (A <= B + 2) return 1 - (1 - 0.05) ** M;
  return 1 - (1 - (21 + B - A) / 20) ** M;
}

// Returns the probability of a critical hit
// given the attacker's critical range, and advantage modifier.
function p_crit(crit_range: number, adv_mod: number): number {
  return 1 - Math.pow(1 - (21 - crit_range) / 20, adv_mod);
}

//-------------------//
//--- TEST SCRIPT ---//
//-------------------//
/*let my_attack = new Attack(
    "Holy Attack",
    9,
    5,
    new DiceSet([
      {
          "sides": 6,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967414633
      },
      {
          "sides": 6,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967414867
      }
  ]),
    new DiceSet([
      {
          "sides": 6,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967445367
      },
      {
          "sides": 6,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967445501
      },
      {
          "sides": 6,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967445678
      },
      {
          "sides": 6,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967445828
      },
      {
          "sides": 8,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967455705
      },
      {
          "sides": 8,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967455896
      },
      {
          "sides": 8,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967456243
      },
      {
          "sides": 8,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967456903
      },
      {
          "sides": 8,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967457546
      },
      {
          "sides": 8,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967457819
      },
      {
          "sides": 8,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967458124
      },
      {
          "sides": 8,
          "reroll": 0,
          "minRoll": 1,
          "id": 1654967458564
      }
  ]),
    2,
    true,
    20,
    15
)

console.log("\n          Chance to Hit: " + p_hit(15, 4, 2));
console.log("       Damage From Dice: " + my_attack.getAverageFromDice());
console.log("      Damage From Bonus: " + my_attack.getAverageFromBonus());
console.log("Damage From Crit Factor: " + my_attack.getAverageFromCritFactor());
console.log("           Damage Total: " + my_attack.getAverageTotal());*/
