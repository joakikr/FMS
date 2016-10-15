var app = angular.module('fmsApp', []);

// Directive will allow event to happen on right-click
// To use directive: ng-right-click="<expr>"
app.directive('ngRightClick', function($parse) {
	return function(scope, element, attrs) {
		var fn = $parse(attrs.ngRightClick);
		element.bind('contextmenu', function(event) {
			scope.$apply(function() {
				event.preventDefault();
				fn(scope, {$event:event});
			});
		});
	};
});

app.service('minefield', function($timeout) {

	// Enum for the different spot types
	this.SPOT_TYPE = {
		NUMBER : 0,
		MINE : 1,
		MINE_WRONG : 2,
		FLAG_MINE_WRONG : 3
	};

	// The minefield
	this.minefield 	= {};

	// Board relates variables
	this.minesLeft 	= 0;
	this.flagsSet 	= 0;

	this.createMinefield = function(level) {
		this.minefield 		= {};
		this.minefield.rows = [];	
		this.minesLeft 		= 0;
		this.flagsSet		= 0;	
		
		// Init as empty board
		for(var i = 0; i < level.HEIGHT; i++) {
			var row = {};
			row.spots = [];

			for(var j = 0; j < level.WIDTH; j++) {
				var spot = {};
				spot.isCovered = true;
				spot.isFlag = false;
				spot.isFlagSuspect = false;
				spot.flash = false;
				spot.adjacentMines = 0;
				spot.content = this.SPOT_TYPE.NUMBER;
				row.spots.push(spot);
			}

			this.minefield.rows.push(row);
		}

		// Add on random mines
		for(var mine = 0; mine < level.MINES; mine++) {
			this.placeRandomMine(level);
		}
	}

	this.getSpot = function(row, column) {
		return this.minefield.rows[row].spots[column];
	}

	this.placeRandomMine = function(level) {
		// Collect valid spots
		var spots = [];

		for(var i = 0; i < level.HEIGHT; i++) {
			for(var j = 0; j < level.WIDTH; j++) {
				var spot = this.getSpot(i, j);
				if(spot.content != this.SPOT_TYPE.MINE && spot.isCovered) {
					spots.push({ spot : spot, row : i, column : j});
				}
			}
		}

		// No valid spots found?
		if(spots.length == 0) return;

		// Place mine!
		var index = Math.floor(Math.random() * spots.length);
		var elem = spots[index];
		elem.spot.content = this.SPOT_TYPE.MINE;			
		elem.spot.isFlag = false;

		// Update adjacent spots numbers
		this.updateAdjacentNumbers(level, elem.row, elem.column, true);

		// Update flags needed to place
		this.minesLeft++;
	}

	this.removeRandomMine = function(level) {
		// No mines left? 
		if(this.minesLeft == 0) return;

		// Collect mines
		var mines = [];

		for(var i = 0; i < level.HEIGHT; i++) {
			for(var j = 0; j < level.WIDTH; j++) {
				var spot = this.getSpot(i, j);
				if(spot.content == this.SPOT_TYPE.MINE && spot.isCovered) {
					mines.push({ spot : spot, row : i, column : j});
				}
			}
		}

		// No valid mines found?
		if(mines.length == 0) return;

		// Remove mine!
		var index = Math.floor(Math.random() * mines.length);
		var elem = mines[index];
		elem.spot.content = this.SPOT_TYPE.NUMBER;			
		elem.spot.isFlag = false;

		// Update adjacent mines numbers
		this.updateAdjacentNumbers(level, elem.row, elem.column, false);

		// Update flags needed to place
		this.minesLeft--;
	}

	// NOT USED
	this.flashMines = function(level) {
		// Flash all mines for some time
		for(var i = 0; i < level.WIDTH; i++) {
			for(var j = 0; j < level.HEIGHT; j++) {
				var spot = this.getSpot(j, i);
				if(spot.content == this.SPOT_TYPE.MINE) {
					spot.flash = true;
				}
			}
		}

		$timeout(function() {
			for(var i = 0; i < level.WIDTH; i++) {
				for(var j = 0; j < level.HEIGHT; j++) {
					// TODO: How to call getSpot??
					var spot = getSpot(j, i);
					if(spot.content == this.SPOT_TYPE.MINE) {
						spot.flash = false;
					}
				}
			}
		}, level.FLASH_TIME);
	}

	/**
	 *	@param row : row for spot to update adjacents too
	 *	@param column: column for spot to update adjacents too
	 *	@param flag: true will increase adjacents count, false will decrease
	*/
	this.updateAdjacentNumbers = function(level, row, column, flag) {
		// Update Top
		if(row > 0) {
			if(flag) this.getSpot(row - 1, column).adjacentMines++;
			else this.getSpot(row - 1, column).adjacentMines--;
		}

		// Update Left
		if(column > 0) {
			if(flag) this.getSpot(row, column - 1).adjacentMines++;
			else this.getSpot(row, column - 1).adjacentMines--;
		}

		// Update Bottom
		if(row < level.HEIGHT - 1) {
			if(flag) this.getSpot(row + 1, column).adjacentMines++;
			else this.getSpot(row + 1, column).adjacentMines--;
		}

		// Update Right
		if(column < level.WIDTH - 1) {
			if(flag) this.getSpot(row, column + 1).adjacentMines++;
			else this.getSpot(row, column + 1).adjacentMines--;
		}

		// Update Top Left
		if(row > 0 && column > 0) {
			if(flag) this.getSpot(row - 1, column - 1).adjacentMines++;
			else this.getSpot(row - 1, column - 1).adjacentMines--;
		}

		// Update Top Right
		if(row > 0 && column < level.WIDTH - 1) {
			if(flag) this.getSpot(row - 1, column + 1).adjacentMines++;
			else this.getSpot(row - 1, column + 1).adjacentMines--;
		}

		// Update Bottom Left
		if(row < level.HEIGHT - 1 && column > 0) {
			if(flag) this.getSpot(row + 1, column - 1).adjacentMines++;
			else this.getSpot(row + 1, column - 1).adjacentMines--;
		}

		// Update Bottom Right
		if(row < level.HEIGHT - 1 && column < level.WIDTH - 1) {
			if(flag) this.getSpot(row + 1, column + 1).adjacentMines++;
			else this.getSpot(row + 1, column + 1).adjacentMines--;
		}
	}

	this.revealAdjacentBlanks = function(level, row, column) {
		// Reveal this spot if it's not a flag or flag suspect
		var thisSpot = this.getSpot(row, column);
		if(thisSpot.isFlag || thisSpot.isFlagSuspect) return;

		thisSpot.isCovered = false;

		// Was it a number or mine, then stop.
		if(thisSpot.content == this.SPOT_TYPE.MINE || 
			(thisSpot.content == this.SPOT_TYPE.NUMBER && thisSpot.adjacentMines > 0)) return;


		// Check top
		if(row > 0) {
			var spot = this.getSpot(row - 1, column);
			if(spot.isCovered && spot.content != this.SPOT_TYPE.MINE) {
				this.revealAdjacentBlanks(level, row - 1, column);
			}
		}

		// Check bottom
		if(row < level.HEIGHT - 1) {
			var spot = this.getSpot(row + 1, column);
			if(spot.isCovered && spot.content != this.SPOT_TYPE.MINE) {
				this.revealAdjacentBlanks(level, row + 1, column);
			}
		}

		// Check left
		if(column > 0) {
			var spot = this.getSpot(row, column - 1);
			if(spot.isCovered && spot.content != this.SPOT_TYPE.MINE) {
				this.revealAdjacentBlanks(level, row, column - 1);
			}
		}

		// Check right
		if(column < level.WIDTH - 1) {
			var spot = this.getSpot(row, column + 1);
			if(spot.isCovered && spot.content != this.SPOT_TYPE.MINE) {
				this.revealAdjacentBlanks(level, row, column + 1);
			}
		}

		// Check Top Left
		if(row > 0 && column > 0) {
			var spot = this.getSpot(row - 1, column - 1);
			if(spot.isCovered && spot.content != this.SPOT_TYPE.MINE) {
				this.revealAdjacentBlanks(level, row - 1, column - 1);
			}
		}

		// Check Top Right
		if(row > 0 && column < level.WIDTH - 1) {
			var spot = this.getSpot(row - 1, column + 1);
			if(spot.isCovered && spot.content != this.SPOT_TYPE.MINE) {
				this.revealAdjacentBlanks(level, row - 1, column + 1);
			}
		}

		// Check Bottom Left
		if(row < level.HEIGHT - 1 && column > 0) {
			var spot = this.getSpot(row + 1, column - 1);
			if(spot.isCovered && spot.content != this.SPOT_TYPE.MINE) {
				this.revealAdjacentBlanks(level, row + 1, column - 1);
			}
		}

		// Check Bottom Right
		if(row < level.HEIGHT - 1 && column < level.WIDTH - 1) {
			var spot = this.getSpot(row + 1, column + 1);
			if(spot.isCovered && spot.content != this.SPOT_TYPE.MINE) {
				this.revealAdjacentBlanks(level, row + 1, column + 1);
			}
		}
	}

	this.revealAllMines = function(level) {
		for(var i = 0; i < level.HEIGHT; i++) {
			for(var j = 0; j < level.WIDTH; j++) {
				var spot = this.getSpot(i, j);

				// No flag and covered? Just reveal.
				if(spot.isCovered && !spot.isFlag && spot.content == this.SPOT_TYPE.MINE) {
					spot.isCovered = false;
				}

				// Flag wrong and covered? Reveal as flag-mine-wrong
				else if(spot.isCovered && spot.isFlag && spot.content != this.SPOT_TYPE.MINE) {
					spot.isCovered = false;
					spot.content = this.SPOT_TYPE.FLAG_MINE_WRONG;
				}

				// Revealed and mine? Reveal as mine-wrong
				else if(!spot.isCovered && spot.content == this.SPOT_TYPE.MINE) {
					spot.content = this.SPOT_TYPE.MINE_WRONG;
				}

			}
		}
	}

	this.setAllFlags = function(level) {
		for(var i = 0; i < level.HEIGHT; i++) {
			for(var j = 0; j < level.WIDTH; j++) {
				var spot = this.getSpot(i, j);

				if(spot.content == this.SPOT_TYPE.MINE) {
					spot.isFlag = true;
					this.flagsSet++;
				}
			}
		}
	}

	this.mineFound = function(level) {
		for(var i = 0; i < level.HEIGHT; i++) {
			for(var j = 0; j < level.WIDTH; j++) {
				var spot = this.getSpot(i, j);
				 if(!spot.isCovered && spot.content == this.SPOT_TYPE.MINE) {
					return true;
				}
			}
		}
		return false;
	}

	this.onlyMinesLeft = function(level) {
		for(var i = 0; i < level.HEIGHT; i++) {
			for(var j = 0; j < level.WIDTH; j++) {
				var spot = this.getSpot(i, j);
				 if(spot.isCovered && spot.content != this.SPOT_TYPE.MINE) {
				 	console.log(spot)
					return true;
				}
			}
		}
		return true;
	}

	this.nonmineNotFound = function(level) {
		for(var i = 0; i < level.HEIGHT; i++) {
			for(var j = 0; j < level.WIDTH; j++) {
				var spot = this.getSpot(i, j);
				if(spot.isCovered && spot.content == this.SPOT_TYPE.NUMBER) {
					return true;
				}
			}
		}
		return false;
	}

});

// Controller for game.
// Will handle all logic for game, 
// including starting new game, updating current and clean up.
app.controller('fmsCtrl', function($scope, $interval, minefield) {

	/*****************/
	/*** VARIABLES ***/
	/*****************/

	// Enum for the different game states
	$scope.STATE = {
		PLAYING : 0,
		LOST: 1, 
		WON : 2
	};

	// Settings for the level
	$scope.LEVEL = {

		EASY : {
			WIDTH : 9,
			HEIGHT : 9,
			MINES : 10,
			COUNTDOWN : 10,
			FLASH_TIME : 200
		},

		MEDIUM : {
			WIDTH : 16,
			HEIGHT : 16,
			MINES : 40,
			COUNTDOWN : 8,
			FLASH_TIME : 100,
		},

		HARD : {
			WIDTH : 30,
			HEIGHT : 16,
			MINES : 99,
			COUNTDOWN : 2,
			FLASH_TIME : 400,
		},
	};

	/***************/
	/*** GETTERS ***/
	/***************/
	$scope.getMinesLeft = function() {
		return minefield.minesLeft;
	}

	$scope.getFlagsSet = function() {
		return minefield.flagsSet;
	}

	$scope.getMinefield = function() {
		return minefield.minefield;
	}

	$scope.getSpotTypes = function() {
		return minefield.SPOT_TYPE;
	}

	/*************/
	/*** LOGIC ***/
	/*************/
	$scope.rightClick = function(spot) {
		if($scope.status != $scope.STATE.PLAYING) return;

		if(spot.isFlag) {
			minefield.flagsSet--;
			spot.isFlagSuspect = true;
			spot.isFlag = false;
		} else if(spot.isFlagSuspect){
			spot.isFlagSuspect = false;
			spot.isFlag = false;
		} else {
			minefield.flagsSet++;
			spot.isFlag = true;
			spot.isFlagSuspect = false;
		}
	}

	$scope.mineManipulation = function() {
		// Choose random from:
		// * Add mine 	 	: 0
		// * Remove mine 	: 1
		// * Move mine 		: 2
		// -- * Flash board	: 3 --

		var opt = Math.floor(Math.random() * 3);

		switch(opt) {
			case 0:
				minefield.placeRandomMine($scope.level);
				break;
			case 1:
				minefield.removeRandomMine($scope.level);
				break;
			case 2:
				minefield.removeRandomMine($scope.level);
				minefield.placeRandomMine($scope.level);
				break;
		}

		$scope.update();
	}

	$scope.uncoverSpot = function(spot, row, column) {
		// Check that we're still playing.
		if($scope.status != $scope.STATE.PLAYING) return;

		// Reveal spot(s)
		minefield.revealAdjacentBlanks($scope.level, row, column);

		// Update game
		$scope.update();
	}

	$scope.update = function() {
	    // Mine discovered? That is bad-luck :(
    	if(minefield.mineFound($scope.level)) {
    		$scope.status = $scope.STATE.LOST;

	    // Not all numbers/blanks found? Continue playing.
		} else if(minefield.nonmineNotFound($scope.level)) {
			$scope.status = $scope.STATE.PLAYING;

		// Only mines left? Win :D
		} else if(minefield.onlyMinesLeft($scope.level)) {
			$scope.status = $scope.STATE.WON;
		} 

		// Check status
		if($scope.status != $scope.STATE.PLAYING) {

	    	// Stop countdown
		    $interval.cancel($scope.funkyMineInterval);
		    $scope.funkyMineInterval = undefined;

	    	// Reveal all mines if loss
	    	if($scope.status == $scope.STATE.LOST) {
		    	minefield.revealAllMines($scope.level);
		    
		    // Set all flags left if win
		    } else if($scope.status == $scope.STATE.WON) {
		    	minefield.setAllFlags($scope.level);
		    }
		}
	}

	$scope.init = function(level) {
		// Set game variables
		$scope.level 			= level;
		$scope.status 			= $scope.STATE.PLAYING;

		// Create the minefield
		minefield.createMinefield(level);

		// Funky mine every COUNTDOWN sec
		if (angular.isDefined($scope.funkyMineInterval)) {
	        $interval.cancel($scope.funkyMineInterval);
	        $scope.funkyMineInterval = undefined;
        }

		$scope.countDown 			= $scope.level.COUNTDOWN;
		$scope.funkyMineInterval 	= $interval(function() {

			if($scope.countDown-- == 0) {
				$scope.mineManipulation();
				$scope.countDown = $scope.level.COUNTDOWN;
			}		
				
		}, 1000,0);
	}

	// Let's go!
	$scope.init($scope.LEVEL.EASY);

});
