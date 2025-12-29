
import Phaser from 'phaser';
import { TileType } from '../../types';

export const GridUtils = {
    getAllTilesOfColor(grid: any[][], group: Phaser.GameObjects.Group | null, color: string): any[] {
        if (!group) return [];
        return group.getChildren().filter((t: any) => t.active && t.getData('color') === color);
    },

    getMostFrequentColorOnBoard(grid: any[][], config: { colors: string[] }): string {
        const counts: {[k:string]:number} = {};
        let max = 0; 
        let maxColor = (config.colors && config.colors.length > 0) ? config.colors[0] : '';
        grid.flat().forEach(t => {
            if (t && t.active && t.getData('type') === TileType.NORMAL) {
                const c = t.getData('color');
                counts[c] = (counts[c] || 0) + 1;
                if (counts[c] > max) { max = counts[c]; maxColor = c; }
            }
        });
        return maxColor;
    },

    getRow(grid: any[][], r: number, rows: number): any[] {
        if(r < 0 || r >= rows) return [];
        return grid[r].filter(t => t && t.active);
    },

    getCol(grid: any[][], c: number, cols: number): any[] {
        if(c < 0 || c >= cols) return [];
        return grid.map(row => row[c]).filter(t => t && t.active);
    },

    getArea(grid: any[][], r: number, c: number, radius: number, rows: number, cols: number): any[] {
        let tiles = [];
        for(let y=r-radius; y<=r+radius; y++) {
            for(let x=c-radius; x<=c+radius; x++) {
                if(y>=0 && y<rows && x>=0 && x<cols && grid[y][x] && grid[y][x].active) {
                    tiles.push(grid[y][x]);
                }
            }
        }
        return tiles;
    },

    findMatches(grid: any[][], rows: number, cols: number): { tiles: any[], width: number, height: number }[] {
        const matchedTiles = new Set<any>();
        
        // Helper
        const addMatch = (match: any[]) => {
            if (match.length >= 3) match.forEach(t => matchedTiles.add(t));
        };

        // Horizontal
        for (let r = 0; r < rows; r++) {
            let match = [];
            for (let c = 0; c < cols; c++) {
                const tile = grid[r][c];
                const isNormal = tile && tile.getData('type') === TileType.NORMAL;
                
                if (isNormal) {
                    if (match.length === 0 || match[match.length-1].getData('color') === tile.getData('color')) {
                        match.push(tile);
                    } else {
                        addMatch(match);
                        match = [tile];
                    }
                } else {
                    addMatch(match);
                    match = [];
                }
            }
            addMatch(match);
        }

        // Vertical
        for (let c = 0; c < cols; c++) {
            let match = [];
            for (let r = 0; r < rows; r++) {
                const tile = grid[r][c];
                const isNormal = tile && tile.getData('type') === TileType.NORMAL;

                if (isNormal) {
                    if (match.length === 0 || match[match.length-1].getData('color') === tile.getData('color')) {
                        match.push(tile);
                    } else {
                        addMatch(match);
                        match = [tile];
                    }
                } else {
                     addMatch(match);
                     match = [];
                }
            }
            addMatch(match);
        }

        // Grouping
        const allMatchedArr = Array.from(matchedTiles);
        const processed = new Set<any>();
        const groups = [];

        for (const t of allMatchedArr) {
            if (processed.has(t)) continue;
            const groupTiles: any[] = [];
            const stack = [t];
            processed.add(t);
            groupTiles.push(t);

            while (stack.length > 0) {
                const cur = stack.pop();
                const r = cur.getData('row');
                const c = cur.getData('col');
                const neighbors = [{r:r+1,c}, {r:r-1,c}, {r,c:c+1}, {r,c:c-1}];
                
                for (const n of neighbors) {
                    if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
                        const nt = grid[n.r][n.c];
                        if (nt && matchedTiles.has(nt) && !processed.has(nt) && nt.getData('color') === t.getData('color')) {
                            processed.add(nt);
                            groupTiles.push(nt);
                            stack.push(nt);
                        }
                    }
                }
            }
            
            const gRows = new Set(groupTiles.map(x => x.getData('row')));
            const gCols = new Set(groupTiles.map(x => x.getData('col')));
            groups.push({ tiles: groupTiles, width: gCols.size, height: gRows.size });
        }
        return groups;
    },

    checkCombo(t1: any, t2: any): { type: string, tiles: any[] } | null {
        if (!t1.scene || !t2.scene) return null; 
        const type1 = t1.getData('type');
        const type2 = t2.getData('type');
        const isSpecial = (t: string) => t !== TileType.NORMAL;
        
        if (isSpecial(type1) && isSpecial(type2)) return { type: 'COMBO_SPECIAL', tiles: [t1, t2] };
        
        if ((type1 === TileType.MAGIC && type2 === TileType.NORMAL) || (type2 === TileType.MAGIC && type1 === TileType.NORMAL)) {
             return { type: 'MAGIC_NORMAL', tiles: [t1, t2] };
        }
        
        // SPECIAL_NORMAL removed to allow normal match processing priority
        
        return null;
    },

    checkMatchAt(grid: any[][], row: number, col: number, rows: number, cols: number): boolean {
        const tile = grid[row][col];
        if (!tile || tile.getData('type') !== TileType.NORMAL) return false;
        
        const color = tile.getData('color');

        // Check Horizontal
        let hCount = 1;
        // Left
        let k = col - 1;
        while(k >= 0 && grid[row][k] && grid[row][k].active && grid[row][k].getData('type') === TileType.NORMAL && grid[row][k].getData('color') === color) { hCount++; k--; }
        // Right
        k = col + 1;
        while(k < cols && grid[row][k] && grid[row][k].active && grid[row][k].getData('type') === TileType.NORMAL && grid[row][k].getData('color') === color) { hCount++; k++; }
        if (hCount >= 3) return true;

        // Check Vertical
        let vCount = 1;
        // Up
        k = row - 1;
        while(k >= 0 && grid[k][col] && grid[k][col].active && grid[k][col].getData('type') === TileType.NORMAL && grid[k][col].getData('color') === color) { vCount++; k--; }
        // Down
        k = row + 1;
        while(k < rows && grid[k][col] && grid[k][col].active && grid[k][col].getData('type') === TileType.NORMAL && grid[k][col].getData('color') === color) { vCount++; k++; }
        if (vCount >= 3) return true;

        return false;
    }
};
