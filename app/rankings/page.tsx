'use client';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect, useMemo } from "react";
import { supabase } from '../../lib/supabaseClient';
import { useSession } from '@supabase/auth-helpers-react';
import * as NFLIcons from 'react-nfl-logos';

type Player = {
  player_id: string;
  name: string;
  team: string;
  position: string;
  number: number;
  age: number;
  status: string;
  depth_chart_order: number;
  adp?: number | null;
  '24_Finish'?: number | null;
  '24_PPG'?: number | null;
};

type Tier = {
  id: string; // unique id for dnd-kit
  name: string;
};

type PlayerListItem = { type: 'player'; player: Player; tierIndex: number };
type TierListItem = { type: 'tier'; tier: Tier };
type ListItem = PlayerListItem | TierListItem;

type GroupKey = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE';

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: 'ALL', label: 'Overall' },
  { key: 'QB', label: 'QB' },
  { key: 'RB', label: 'RB' },
  { key: 'WR', label: 'WR' },
  { key: 'TE', label: 'TE' },
];

// Team logo mapping to React-NFL-Logos components
const TEAM_LOGOS: Record<string, any> = {
  'ARI': NFLIcons.ARI,
  'ATL': NFLIcons.ATL,
  'BAL': NFLIcons.BAL,
  'BUF': NFLIcons.BUF,
  'CAR': NFLIcons.CAR,
  'CHI': NFLIcons.CHI,
  'CIN': NFLIcons.CIN,
  'CLE': NFLIcons.CLE,
  'DAL': NFLIcons.DAL,
  'DEN': NFLIcons.DEN,
  'DET': NFLIcons.DET,
  'GB': NFLIcons.GB,
  'HOU': NFLIcons.HOU,
  'IND': NFLIcons.IND,
  'JAX': NFLIcons.JAX,
  'KC': NFLIcons.KC,
  'LAC': NFLIcons.LAC,
  'LAR': NFLIcons.LAR,
  'LV': NFLIcons.LV,
  'MIA': NFLIcons.MIA,
  'MIN': NFLIcons.MIN,
  'NE': NFLIcons.NE,
  'NO': NFLIcons.NO,
  'NYG': NFLIcons.NYG,
  'NYJ': NFLIcons.NYJ,
  'PHI': NFLIcons.PHI,
  'PIT': NFLIcons.PIT,
  'SEA': NFLIcons.SEA,
  'SF': NFLIcons.SF,
  'TB': NFLIcons.TB,
  'WAS': NFLIcons.WAS,
};

const generateTierId = () => `tier-${Math.random().toString(36).slice(2, 10)}`;

// Helper function to get team logo component
function getTeamLogo(teamAbbr: string) {
  console.log('Getting logo for team:', teamAbbr);
  const LogoComponent = TEAM_LOGOS[teamAbbr];
  console.log('LogoComponent found:', !!LogoComponent);
  if (LogoComponent) {
    return <LogoComponent size={36} />;
  }
  return teamAbbr; // Fallback to abbreviation if logo not found
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: "100%",
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function isPlayerListItem(item: ListItem): item is PlayerListItem {
  return item.type === 'player';
}

// Helper to get ADP circle color based on rank difference
function getAdpCircleColor(rank: number | undefined, adp: number | undefined) {
  if (rank == null || adp == null) return '#000000';
  const diff = adp - rank;
  if (diff <= -10) return '#ef4444'; // 10+ above ADP: red (same as gauges)
  if (diff >= 10) return '#10b981'; // 10+ below ADP: green (same as gauges)
  if (diff === 0) return '#000000'; // at ADP: black
  // Interpolate between green (10), black (0), red (-10)
  if (diff > 0) {
    // Between black and green
    const t = diff / 10;
    // Interpolate black (#000000) to green (#10b981)
    const r = Math.round(16 * t);
    const g = Math.round(185 * t);
    const b = Math.round(129 * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // Between black and red
    const t = -diff / 10;
    // Interpolate black (#000000) to red (#ef4444)
    const r = Math.round(239 * t);
    const g = Math.round(68 * t);
    const b = Math.round(68 * t);
    return `rgb(${r},${g},${b})`;
  }
}

// Function to determine row color - simple dark theme color
function getRowColor(player: Player, rank: number, positionalAdp: number | undefined) {
  return '#1f2937'; // Dark gray that fits the theme
}

// Function to determine text color based on rank vs ADP difference
function getTextColor(player: Player, rank: number, positionalAdp: number | undefined, group?: GroupKey) {
  return '#d1d5db';
}

// --- NEW FLAT LIST TYPES ---
type FlatListItem =
  | { type: 'tier'; id: string; name: string }
  | { type: 'player'; player: Player };

export default function TieredRankings() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [flatList, setFlatList] = useState<FlatListItem[]>([]); // FLAT LIST
  const initialAllGroupLists: Record<GroupKey, FlatListItem[]> = {
    ALL: [],
    QB: [],
    RB: [],
    WR: [],
    TE: [],
  };
  const [allGroupLists, setAllGroupLists] = useState<Record<GroupKey, FlatListItem[]>>(initialAllGroupLists);
  const [group, setGroup] = useState<GroupKey>('ALL');
  const [loading, setLoading] = useState(true);
  const session = useSession();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isMobile, setIsMobile] = useState(false);

  // Test if NFL logos are working
  console.log('NFLIcons available:', !!NFLIcons);
  console.log('Sample logo components:', {
    KC: !!NFLIcons.KC,
    DAL: !!NFLIcons.DAL,
    GB: !!NFLIcons.GB
  });

  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase
        .from('players')
        .select('*');
      if (data) setPlayers(data);
    }
    loadPlayers();
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function loadAllGroupLists() {
      if (!session?.user?.id || players.length === 0) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
        .from('user_tiers')
          .select('flat_list_by_group')
        .eq('user_id', session.user.id)
        .single();
        if (error) {
          console.error('Supabase load error:', error);
        }
        let flatListByGroup = data?.flat_list_by_group || {};
        console.log('Loaded flatListByGroup from Supabase:', flatListByGroup);
        // For each group, ensure a default if missing
        const newAllGroupLists: Record<GroupKey, FlatListItem[]> = { ...flatListByGroup };
        (GROUPS.map(g => g.key) as GroupKey[]).forEach((gk) => {
          if (!newAllGroupLists[gk] || !Array.isArray(newAllGroupLists[gk])) {
            let groupPlayers = gk === 'ALL'
          ? players
              : players.filter(p => p.position === gk);
        groupPlayers = groupPlayers.filter(p => p.adp !== null && p.adp !== undefined);
            groupPlayers = [...groupPlayers].sort((a, b) => (a.adp ?? Infinity) - (b.adp ?? Infinity));
            newAllGroupLists[gk] = [
              { type: 'tier', id: generateTierId(), name: 'Tier 1' },
              ...groupPlayers.map(p => ({ type: 'player' as const, player: p })),
            ];
      } else {
            // Filter out missing players
            newAllGroupLists[gk] = newAllGroupLists[gk].map((item: any) => {
              if (item.type === 'tier') return { type: 'tier' as const, id: item.id, name: item.name };
              if (item.type === 'player') {
                const player = players.find(p => p.player_id === item.player.player_id);
                return player ? { type: 'player' as const, player } : null;
              }
              return null;
            }).filter(Boolean) as FlatListItem[];
            if (!newAllGroupLists[gk].length || newAllGroupLists[gk][0].type !== 'tier') {
              newAllGroupLists[gk].unshift({ type: 'tier', id: generateTierId(), name: 'Tier 1' });
          }
          }
        });
        setAllGroupLists(newAllGroupLists);
        setFlatList(newAllGroupLists[group]);
      } catch (err) {
        console.error('Error in loadAllGroupLists:', err);
      }
      setLoading(false);
    }
    loadAllGroupLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, players]);

  // Save all groups to Supabase
  async function saveAllGroupListsToSupabase(updatedAllGroupLists: Record<GroupKey, FlatListItem[]>) {
    if (!session?.user?.id) return;
    try {
      console.log('Saving allGroupLists to Supabase:', updatedAllGroupLists);
      const { error } = await supabase
      .from('user_tiers')
      .upsert([
        {
          user_id: session.user.id,
            flat_list_by_group: updatedAllGroupLists,
          updated_at: new Date().toISOString(),
        }
      ], { onConflict: 'user_id' });
      if (error) {
        console.error('Supabase save error:', error);
      } else {
        console.log('Save to Supabase successful.');
      }
    } catch (err) {
      console.error('Error in saveAllGroupListsToSupabase:', err);
    }
  }

  // Save current group to allGroupLists and Supabase
  async function saveCurrentGroupList(newFlatList: FlatListItem[], newGroup: GroupKey = group) {
    const updatedAllGroupLists = { ...allGroupLists, [newGroup]: newFlatList };
    setAllGroupLists(updatedAllGroupLists);
    await saveAllGroupListsToSupabase(updatedAllGroupLists);
  }

  // Add a new tier header after the last tier or at a specific position
  function addTier() {
    let lastTierIdx = flatList.map((item, idx) => item.type === 'tier' && idx > 0 ? idx : -1).filter(idx => idx !== -1).pop() ?? 0;
    const newTier: FlatListItem = { type: 'tier', id: generateTierId(), name: '' };
    const insertIdx = lastTierIdx > 0 ? lastTierIdx + 1 : 1;
    const newFlatList: FlatListItem[] = [
      ...flatList.slice(0, insertIdx),
      { ...newTier, name: `Tier ${flatList.filter(i => i.type === 'tier').length + 1}` },
      ...flatList.slice(insertIdx),
    ];
    setFlatList(newFlatList);
    saveCurrentGroupList(newFlatList);
  }

  // Remove a tier header (except Tier 1)
  function handleRemoveTier(tierId: string) {
    if (flatList[0].type === 'tier' && flatList[0].id === tierId) return;
    const idx = flatList.findIndex(item => item.type === 'tier' && item.id === tierId);
    if (idx === -1) return;
    let nextTierIdx = flatList.findIndex((item, i) => i > idx && item.type === 'tier');
    if (nextTierIdx === -1) nextTierIdx = flatList.length;
    const playersToMove = flatList.slice(idx + 1, nextTierIdx).filter(item => item.type === 'player') as FlatListItem[];
    let newFlatList: FlatListItem[] = [
      ...flatList.slice(0, idx),
      ...playersToMove,
      ...flatList.slice(nextTierIdx),
    ];
    let tierCount = 1;
    const renamedFlatList: FlatListItem[] = newFlatList.map(item => {
      if (item.type === 'tier') {
        return { ...item, name: `Tier ${tierCount++}` };
      }
      return item;
    });
    setFlatList(renamedFlatList);
    saveCurrentGroupList(renamedFlatList);
  }

  // Reset group: all players back to Tier 1, sorted by ADP
  function handleResetGroup() {
    if (!window.confirm(`Are you sure you want to reset the ${group === 'ALL' ? 'overall' : group} rankings? This will move all players back to Tier 1 sorted by ADP and cannot be undone.`)) return;
      let groupPlayers = group === 'ALL'
        ? players
        : players.filter(p => p.position === group);
      groupPlayers = groupPlayers.filter(p => p.adp !== null && p.adp !== undefined);
    groupPlayers = [...groupPlayers].sort((a, b) => (a.adp ?? Infinity) - (b.adp ?? Infinity));
    const newFlatList: FlatListItem[] = [
      { type: 'tier', id: generateTierId(), name: 'Tier 1' },
      ...groupPlayers.map(p => ({ type: 'player' as const, player: p })),
    ];
    setFlatList(newFlatList);
    saveCurrentGroupList(newFlatList);
  }

  // Reset tiers: flatten all players in current order under Tier 1
  function handleResetTiers() {
    if (!window.confirm('Are you sure you want to reset the tiers? This will delete all tiers except Tier 1. Player rankings and order will remain the same.')) return;
    const allPlayers = flatList.filter(item => item.type === 'player') as FlatListItem[];
    const newFlatList: FlatListItem[] = [
      { type: 'tier', id: generateTierId(), name: 'Tier 1' },
      ...allPlayers,
    ];
    setFlatList(newFlatList);
    saveCurrentGroupList(newFlatList);
  }

  // DnD logic for flat list
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    // Prevent drag and drop when sorting is active
    if (sortColumn) {
      return;
  }

    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIdx = flatList.findIndex((item, idx) => idx > 0 && (item.type === 'tier' ? item.id === active.id : item.type === 'player' && item.player.player_id === active.id));
    const overIdx = flatList.findIndex((item, idx) => idx > 0 && (item.type === 'tier' ? item.id === over.id : item.type === 'player' && item.player.player_id === over.id));
    if (activeIdx === -1 || overIdx === -1) return;
    // Always create new objects for each item to avoid React key issues
    const newFlatList = flatList.map(item => {
      if (item.type === 'player') return { type: 'player' as const, player: { ...item.player } };
      if (item.type === 'tier') return { ...item };
      return item;
    });
    const [moved] = newFlatList.splice(activeIdx, 1);
    newFlatList.splice(overIdx, 0, moved);
    let tierCount = 1;
    const renamedFlatList: FlatListItem[] = newFlatList.map(item => {
      if (item.type === 'tier') {
        return { ...item, name: `Tier ${tierCount++}` };
      }
      return item;
    });
    setFlatList(renamedFlatList);
    saveCurrentGroupList(renamedFlatList);
  }

  // Player ranks for display
  const playerRanks = useMemo(() => {
    let rank = 1;
    const ranks: Record<string, number> = {};
    flatList.forEach(item => {
      if (item.type === 'player') {
        ranks[item.player.player_id] = rank++;
      }
    });
    return ranks;
  }, [flatList]);

  // Positional ADP ranks
  const positionalAdpRanks = useMemo(() => {
    if (!players) return {};
    const ranks: Record<string, number> = {};
    const positions = ['QB', 'RB', 'WR', 'TE'];
    positions.forEach(pos => {
      const playersOfPos = players.filter(p => p.position === pos && p.adp !== null && p.adp !== undefined)
        .sort((a, b) => (a.adp ?? Infinity) - (b.adp ?? Infinity));
      playersOfPos.forEach((p, idx) => {
        ranks[p.player_id] = idx + 1;
      });
    });
    return ranks;
  }, [players]);

  // Save and switch group
  const handleGroupChange = async (newGroup: GroupKey) => {
    await saveCurrentGroupList(flatList, group);
    setFlatList(allGroupLists[newGroup] || []);
    setGroup(newGroup);
  };

  const handleSort = (column: string) => {
    if (column === 'rank') {
      // Return to rankings view
      setSortColumn(null);
      setSortDirection('asc');
      return;
    }

    if (column === 'ppg2024') {
      // 2024 PPG only sorts descending
      setSortColumn(column);
      setSortDirection('desc');
    } else if (column === 'adp' || column === 'posAdp' || column === 'finish2024') {
      // These columns only sort ascending
      setSortColumn(column);
      setSortDirection('asc');
    } else if (sortColumn === column) {
      // Toggle direction for other columns
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, set to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedPlayers = () => {
    if (!sortColumn) {
      return flatList;
    }

    // Filter out tiers and only sort players
    const playerItems = flatList.filter(item => item.type === 'player');
    
    const sortedPlayers = [...playerItems].sort((a, b) => {
      if (a.type !== 'player' || b.type !== 'player') return 0;
      
      const playerA = a.player;
      const playerB = b.player;
      
      let valueA: any;
      let valueB: any;
      
      switch (sortColumn) {
        case 'adp':
          valueA = playerA.adp ?? Number.MAX_SAFE_INTEGER;
          valueB = playerB.adp ?? Number.MAX_SAFE_INTEGER;
          break;
        case 'posAdp':
          valueA = positionalAdpRanks[playerA.player_id] ?? Number.MAX_SAFE_INTEGER;
          valueB = positionalAdpRanks[playerB.player_id] ?? Number.MAX_SAFE_INTEGER;
          break;
        case 'finish2024':
          valueA = playerA['24_Finish'] ?? Number.MAX_SAFE_INTEGER;
          valueB = playerB['24_Finish'] ?? Number.MAX_SAFE_INTEGER;
          break;
        case 'ppg2024':
          valueA = playerA['24_PPG'] ?? 0;
          valueB = playerB['24_PPG'] ?? 0;
          break;
        default:
          return 0;
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sortedPlayers;
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return (
        <div style={{
          display: 'inline-block',
          width: '0',
          height: '0',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: '6px solid #6b7280',
          marginLeft: '4px',
          opacity: 0.6
        }}></div>
      );
        }
    
    if (column === 'ppg2024') {
      // 2024 PPG always shows descending
      return (
        <div style={{
          display: 'inline-block',
          width: '0',
          height: '0',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: '6px solid #F4900C',
          marginLeft: '4px'
        }}></div>
      );
  }

    if (column === 'adp' || column === 'posAdp' || column === 'finish2024') {
      // These columns always show ascending
      return (
        <div style={{
          display: 'inline-block',
          width: '0',
          height: '0',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderBottom: '6px solid #F4900C',
          marginLeft: '4px'
        }}></div>
      );
  }

    // Other columns show based on current sort direction
    if (sortDirection === 'desc') {
      return (
        <div style={{
          display: 'inline-block',
          width: '0',
          height: '0',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: '6px solid #F4900C',
          marginLeft: '4px'
        }}></div>
      );
    }
    
    return (
      <div style={{
        display: 'inline-block',
        width: '0',
        height: '0',
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderBottom: '6px solid #F4900C',
        marginLeft: '4px'
      }}></div>
    );
  };

  const currentList = sortColumn ? getSortedPlayers() : flatList;

  if (!session) {
    return <div>Please log in to view your rankings.</div>;
  }

  if (loading || !flatList.length) {
    return <div>Loading...</div>;
  }

  // Mobile view render function
  const renderMobileView = () => {
    const currentList = sortColumn ? getSortedPlayers() : flatList;
    const playerItems = currentList.filter(item => item.type === 'player') as FlatListItem[];
    
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#111827', 
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: '16px'
      }}>
        {/* Mobile Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#f9fafb', 
            marginBottom: '8px' 
          }}>
            Player Rankings
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            {group === 'ALL' ? 'Overall Rankings' : `${group} Rankings`}
          </p>
        </div>

        {/* Mobile Position Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {GROUPS.map(g => (
            <button
              key={g.key}
              onClick={() => handleGroupChange(g.key)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                fontWeight: '500',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                ...(group === g.key 
                  ? { backgroundColor: '#F4900C', color: 'white' }
                  : { backgroundColor: '#374151', color: '#d1d5db' }
                )
              }}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Mobile Player Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {playerItems.map((item, idx) => {
            if (item.type !== 'player') return null;
            const player = item.player;
            const rank = playerRanks[player.player_id];
            
            return (
              <div key={player.player_id} style={{
                backgroundColor: '#1f2937',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #374151'
              }}>
                {/* Player Header */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  marginBottom: '12px' 
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: group === 'ALL' 
                      ? getAdpCircleColor(rank, player.adp ?? undefined) 
                      : getAdpCircleColor(rank, positionalAdpRanks[player.player_id]),
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {rank}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: '#f9fafb', 
                      fontWeight: '600', 
                      fontSize: '16px',
                      marginBottom: '2px'
                    }}>
                      {player.name}
                    </div>
                    <div style={{ 
                      color: '#9ca3af', 
                      fontSize: '14px' 
                    }}>
                      {player.team} • {player.position}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {player.team === 'KC' ? <NFLIcons.KC size={32} /> : getTeamLogo(player.team)}
                  </div>
                </div>

                {/* Player Stats */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr', 
                  gap: '12px',
                  fontSize: '14px'
                }}>
                  <div>
                    <div style={{ color: '#9ca3af', marginBottom: '4px' }}>ADP</div>
                    <div style={{ color: '#f9fafb', fontWeight: '500' }}>
                      {group === 'ALL' ? (player.adp ?? '-') : (positionalAdpRanks[player.player_id] ?? '-')}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Age</div>
                    <div style={{ color: '#f9fafb', fontWeight: '500' }}>{player.age}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Depth</div>
                    <div style={{ color: '#f9fafb', fontWeight: '500' }}>{player.depth_chart_order}</div>
                  </div>
                </div>

                {/* Additional Stats for Position Tabs */}
                {group !== 'ALL' && (
                  <div style={{ 
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #374151',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    fontSize: '14px'
                  }}>
                    <div>
                      <div style={{ color: '#9ca3af', marginBottom: '4px' }}>2024 Finish</div>
                      <div style={{ color: '#f9fafb', fontWeight: '500' }}>
                        {player['24_Finish'] ?? '-'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#9ca3af', marginBottom: '4px' }}>2024 PPG</div>
                      <div style={{ color: '#f9fafb', fontWeight: '500' }}>
                        {player['24_PPG'] ? player['24_PPG'].toFixed(1) : '-'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- RENDER ---
  if (isMobile) {
    return renderMobileView();
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Sort Warning Box */}
      {sortColumn && sortColumn !== 'rank' && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          backgroundColor: '#1f2937',
          border: '2px solid #F4900C',
          borderRadius: '8px',
          padding: '8px 16px',
          maxWidth: '200px',
          boxShadow: '0 4px 12px rgba(244, 144, 12, 0.3)',
          zIndex: 1000,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          <div>
            <h4 style={{ color: 'white', marginBottom: '4px', fontSize: '13px', fontWeight: '600' }}>
              Sorting Mode Active
            </h4>
            <p style={{ color: 'white', fontSize: '11px', lineHeight: '1.3', opacity: 0.9 }}>
              Click "Rank" to return to your custom rankings.
            </p>
          </div>
        </div>
      )}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Header Section */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#f9fafb', marginBottom: '8px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Player Rankings</h1>
          <p style={{ color: '#9ca3af', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Organize your fantasy football players into tiers</p>
        </div>
        {/* Controls Section */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid #374151', padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
            {/* Position Tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {GROUPS.map(g => (
                <button
                  key={g.key}
                  onClick={() => handleGroupChange(g.key)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    ...(group === g.key 
                      ? { backgroundColor: '#F4900C', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }
                      : { backgroundColor: '#374151', color: '#d1d5db', cursor: 'pointer' }
                    ),
                    ...(group !== g.key && { ':hover': { backgroundColor: '#4b5563' } })
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
              <button
                onClick={addTier}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
                onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#2563eb'}
              >
                + Add Tier
              </button>
              <button
                onClick={handleResetTiers}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  marginRight: '0px'
                }}
                onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#4b5563'}
                onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#6b7280'}
              >
                Reset Tiers
              </button>
              <button
                onClick={handleResetGroup}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
                onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#4b5563'}
                onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#6b7280'}
              >
                Reset Rankings
              </button>
            </div>
          </div>
        </div>
        {/* Table Section */}
        <div style={{ 
          backgroundColor: '#1f2937', 
          borderRadius: '12px', 
          boxShadow: sortColumn && sortColumn !== 'rank' ? '0 4px 12px rgba(244, 144, 12, 0.3)' : '0 4px 6px rgba(0,0,0,0.3)', 
          border: sortColumn && sortColumn !== 'rank' ? '2px solid #F4900C' : '1px solid #374151', 
          overflow: 'visible',
          position: 'relative'
        }}>
          {/* Column Headers */}
          <div style={{ 
            backgroundColor: '#111827', 
            borderBottom: '1px solid #374151', 
            padding: '8px 16px',
            position: 'sticky',
            top: '0',
            zIndex: 100,
            width: '100%',
            boxSizing: 'border-box',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: group === 'ALL' ? '60px 150px 60px 2px 60px 2px 60px 2px 60px 60px' : '60px 150px 60px 2px 60px 2px 60px 60px 2px 60px 60px', gap: '6px 16px', fontSize: '14px', fontWeight: '600', color: '#9ca3af', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', alignItems: 'center' }}>
                        <div 
            style={{ 
              textAlign: 'center', 
              cursor: 'pointer', 
              userSelect: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '4px',
              color: sortColumn && sortColumn !== 'rank' ? 'white' : '#9ca3af',
              fontWeight: sortColumn && sortColumn !== 'rank' ? '700' : '600',
              backgroundColor: sortColumn && sortColumn !== 'rank' ? '#F4900C' : 'transparent',
              padding: sortColumn && sortColumn !== 'rank' ? '4px 0' : '8px 0',
              width: '100%',
              height: sortColumn && sortColumn !== 'rank' ? '30px' : '100%',
              borderRadius: sortColumn && sortColumn !== 'rank' ? '6px' : '0',
              position: 'relative'
            }}
            onClick={() => handleSort('rank')}
            onMouseEnter={(e) => {
              const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
              if (tooltip) tooltip.style.display = 'block';
            }}
            onMouseLeave={(e) => {
              const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
              if (tooltip) tooltip.style.display = 'none';
            }}
          >
            Rank {getSortIcon('rank')}
            <div className="tooltip" style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#1f2937',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              display: 'none',
              border: '1px solid #374151',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              marginBottom: '4px',
              textAlign: 'center',
              lineHeight: '1.3'
            }}>
              Green = draft value<br />
              Red = draft overpay
            </div>
          </div>
              <div>Name</div>
              <div style={{ textAlign: 'center' }}>Team</div>
              <div style={{ background: '#374151', width: '2px', height: '100%' }}></div>
                        {group === 'ALL' && (
                          <div 
                            style={{ 
                              textAlign: 'center', 
                              cursor: 'pointer', 
                              userSelect: 'none', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '4px',
                              backgroundColor: sortColumn === 'adp' ? '#374151' : 'transparent',
                              padding: sortColumn === 'adp' ? '4px 0' : '8px 0',
                              width: '100%',
                              height: sortColumn === 'adp' ? '30px' : '100%',
                              borderRadius: sortColumn === 'adp' ? '6px' : '0',
                              position: 'relative'
                            }}
                            onClick={() => handleSort('adp')}
                            onMouseEnter={(e) => {
                              const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                              if (tooltip) tooltip.style.display = 'block';
                            }}
                            onMouseLeave={(e) => {
                              const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                              if (tooltip) tooltip.style.display = 'none';
                            }}
                          >
                            ADP {getSortIcon('adp')}
                            <div className="tooltip" style={{
                              position: 'absolute',
                              bottom: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: '#1f2937',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              zIndex: 1000,
                              display: 'none',
                              border: '1px solid #374151',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                              marginBottom: '4px'
                            }}>
                              Underdog ADP
                            </div>
                          </div>
                        )}
          {group !== 'ALL' && (
            <div 
              style={{ 
                textAlign: 'center', 
                cursor: 'pointer', 
                userSelect: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '4px',
                backgroundColor: sortColumn === 'posAdp' ? '#374151' : 'transparent',
                padding: sortColumn === 'posAdp' ? '4px 0' : '8px 0',
                width: '100%',
                height: sortColumn === 'posAdp' ? '30px' : '100%',
                borderRadius: sortColumn === 'posAdp' ? '6px' : '0',
                position: 'relative'
              }}
              onClick={() => handleSort('posAdp')}
              onMouseEnter={(e) => {
                const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                if (tooltip) tooltip.style.display = 'block';
              }}
              onMouseLeave={(e) => {
                const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                if (tooltip) tooltip.style.display = 'none';
              }}
            >
              Pos ADP {getSortIcon('posAdp')}
              <div className="tooltip" style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#1f2937',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                display: 'none',
                border: '1px solid #374151',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                marginBottom: '4px'
              }}>
                Underdog ADP
              </div>
            </div>
          )}
              <div style={{ background: '#374151', width: '2px', height: '100%' }}></div>
                        {group !== 'ALL' && (
                          <div 
                            style={{ 
                              textAlign: 'center', 
                              cursor: 'pointer', 
                              userSelect: 'none', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '4px',
                              backgroundColor: sortColumn === 'finish2024' ? '#374151' : 'transparent',
                              padding: sortColumn === 'finish2024' ? '4px 0' : '8px 0',
                              width: '100%',
                              height: sortColumn === 'finish2024' ? '30px' : '100%',
                              borderRadius: sortColumn === 'finish2024' ? '6px' : '0'
                            }}
                            onClick={() => handleSort('finish2024')}
                          >
                            2024 Finish {getSortIcon('finish2024')}
                          </div>
                        )}
          <div 
            style={{ 
              textAlign: 'center', 
              cursor: 'pointer', 
              userSelect: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '4px',
              backgroundColor: sortColumn === 'ppg2024' ? '#374151' : 'transparent',
              padding: sortColumn === 'ppg2024' ? '4px 0' : '8px 0',
              width: '100%',
              height: sortColumn === 'ppg2024' ? '30px' : '100%',
              borderRadius: sortColumn === 'ppg2024' ? '6px' : '0'
            }}
            onClick={() => handleSort('ppg2024')}
          >
            2024 PPG {getSortIcon('ppg2024')}
          </div>
              <div style={{ background: '#374151', width: '2px', height: '100%' }}></div>
              <div style={{ textAlign: 'center' }}>Age</div>
              <div style={{ textAlign: 'center' }}>Depth</div>
            </div>
          </div>
          {/* Content */}
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '2px solid #F4900C', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ marginTop: '8px', color: '#9ca3af', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Loading rankings...</p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <SortableContext
            items={sortColumn ? currentList.map(item => item.type === 'player' ? item.player.player_id : '') : flatList.slice(1).map(item => item.type === 'tier' ? item.id : item.type === 'player' ? item.player.player_id : '')}
                strategy={verticalListSortingStrategy}
              >
                {/* Render the current list */}
                {currentList.map((item, idx) => {
                  if (item.type === 'tier' && !sortColumn) {
                    // Only show tiers when not sorting
                    if (idx === 0) {
                      return (
                        <div key={item.id} style={{ borderBottom: '1px solid #374151' }}>
                  <div style={{ background: '#000000', color: '#f9fafb', padding: '1px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #6b7280', borderRadius: '4px' }}>
                    <div style={{ flex: 1 }}></div>
                            <span style={{ fontSize: '14px', fontWeight: '300', letterSpacing: '0.1em', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>{item.name}</span>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}></div>
                  </div>
                                </div>
                      );
                    } else {
                      return (
                        <SortableRow key={item.id} id={item.id}>
                          <div style={{ background: '#000000', color: '#f9fafb', padding: '1px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #6b7280', borderRadius: '4px', cursor: 'grab' }}>
                            <span style={{ fontSize: '14px', fontWeight: '300', letterSpacing: '0.1em', textAlign: 'center', width: '100%', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>{item.name}</span>
                          </div>
                        </SortableRow>
                      );
                    }
                    } else if (item.type === 'player') {
                    const player = item.player;
                      return (
                      <SortableRow key={player.player_id} id={player.player_id}>
                            <div 
                              style={{
                            padding: '4px 16px',
                                borderBottom: '1px solid #4b5563',
                                transition: 'all 0.15s',
                            cursor: sortColumn ? 'default' : 'grab',
                                backgroundColor: getRowColor(player, playerRanks[player.player_id], positionalAdpRanks[player.player_id]),
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                              }}
                          onMouseOver={sortColumn ? undefined : (e) => {
                                const target = e.currentTarget as HTMLElement;
                                target.style.border = '2px solid #ffffff';
                                target.style.borderBottom = '1px solid #4b5563';
                              }}
                          onMouseOut={sortColumn ? undefined : (e) => {
                                const target = e.currentTarget as HTMLElement;
                                target.style.border = 'none';
                                target.style.borderBottom = '1px solid #4b5563';
                              }}
                            >
                          <div style={{ display: 'grid', gridTemplateColumns: group === 'ALL' ? '60px 150px 60px 2px 60px 2px 60px 2px 60px 60px' : '60px 150px 60px 2px 60px 2px 60px 60px 2px 60px 60px', gap: '6px 16px', alignItems: 'center' }}>
                                                        <div style={{ 
                              width: '60px', 
                              fontWeight: 'bold', 
                              color: getTextColor(player, playerRanks[player.player_id], positionalAdpRanks[player.player_id], group), 
                                      textAlign: 'center',
                              backgroundColor: sortColumn && sortColumn !== 'rank' ? '#374151' : 'transparent',
                              padding: sortColumn && sortColumn !== 'rank' ? '8px 0' : '8px 0',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      width: 32,
                                      height: 32,
                                      borderRadius: '50%',
                                background: group === 'ALL' 
                                  ? getAdpCircleColor(playerRanks[player.player_id], player.adp ?? undefined) 
                                  : getAdpCircleColor(playerRanks[player.player_id], positionalAdpRanks[player.player_id]),
                                      color: '#fff',
                                      fontWeight: 600,
                                      fontSize: 15,
                                      lineHeight: 1,
                                textAlign: 'center'
                              }}>
                                {playerRanks[player.player_id]}
                              </span>
                            </div>
                            <div style={{ fontWeight: '500', color: getTextColor(player, playerRanks[player.player_id], positionalAdpRanks[player.player_id], group) }}>{player.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}>{player.team === 'KC' ? <NFLIcons.KC size={36} /> : getTeamLogo(player.team)}</div>
                            <div style={{ background: '#374151', width: '2px', height: '32px' }}></div>
                            {group === 'ALL' && (
                          <div style={{ color: getTextColor(player, playerRanks[player.player_id], positionalAdpRanks[player.player_id], group), textAlign: 'center' }}>
                            {player.adp ?? '-'}
                              </div>
                        )}
                            {group !== 'ALL' && (
                          <div style={{ color: getTextColor(player, playerRanks[player.player_id], positionalAdpRanks[player.player_id], group), textAlign: 'center' }}>
                            {positionalAdpRanks[player.player_id] ?? '-'}
                                </div>
                        )}
                            <div style={{ background: '#374151', width: '2px', height: '32px' }}></div>
                            {group !== 'ALL' && (
                              <div style={{ color: getTextColor(player, playerRanks[player.player_id], positionalAdpRanks[player.player_id], group), textAlign: 'center' }}>{player['24_Finish'] ?? '-'}</div>
                            )}
                            <div style={{ color: getTextColor(player, playerRanks[player.player_id], positionalAdpRanks[player.player_id], group), textAlign: 'center' }}>{player['24_PPG'] ? player['24_PPG'].toFixed(1) : '-'}</div>
                            <div style={{ background: '#374151', width: '2px', height: '32px' }}></div>
                            <div style={{ 
                              color: getTextColor(player, playerRanks[player.player_id], positionalAdpRanks[player.player_id], group), 
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                                      justifyContent: 'center',
                              position: 'relative'
                            }}>
                              <div style={{
                                width: '40px',
                                height: '20px',
                                border: '2px solid #374151',
                                borderRadius: '10px',
                                backgroundColor: '#1f2937',
                                position: 'relative',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  height: '100%',
                                  width: group === 'QB' 
                                    ? (player.age <= 27 ? '100%' : player.age <= 30 ? '66%' : '33%')
                                    : (player.age <= 26 ? '100%' : player.age <= 29 ? '66%' : '33%'),
                                  backgroundColor: group === 'QB'
                                    ? (player.age <= 27 ? '#10b981' : player.age <= 30 ? '#f59e0b' : '#ef4444')
                                    : (player.age <= 26 ? '#10b981' : player.age <= 29 ? '#f59e0b' : '#ef4444'),
                                  borderRadius: '8px',
                                  transition: 'all 0.3s ease'
                                }}></div>
                                <div style={{
                                  position: 'absolute',
                                  top: '0',
                                  left: '0',
                                  right: '0',
                                  bottom: '0',
                                  display: 'flex',
                                      alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  opacity: '0',
                                  transition: 'opacity 0.2s ease',
                                  cursor: 'default'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.opacity = '0';
                                }}
                                title={`Age: ${player.age}`}>
                                  {player.age}
                                </div>
                              </div>
                            </div>
                            <div style={{ 
                              color: getTextColor(player, playerRanks[player.player_id], positionalAdpRanks[player.player_id], group), 
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative'
                            }}>
                              <div style={{
                                width: '40px',
                                height: '20px',
                                border: '2px solid #374151',
                                borderRadius: '10px',
                                backgroundColor: '#1f2937',
                                position: 'relative',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  height: '100%',
                                  width: player.depth_chart_order === 1 ? '100%' : player.depth_chart_order === 2 ? '66%' : '33%',
                                  backgroundColor: player.depth_chart_order === 1 ? '#10b981' : player.depth_chart_order === 2 ? '#f59e0b' : '#ef4444',
                                  borderRadius: '8px',
                                  transition: 'all 0.3s ease'
                                }}></div>
                                <div style={{
                                  position: 'absolute',
                                  top: '0',
                                  left: '0',
                                  right: '0',
                                  bottom: '0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  opacity: '0',
                                  transition: 'opacity 0.2s ease',
                                  cursor: 'default'
                            }}
                            onMouseOver={(e) => {
                                  e.currentTarget.style.opacity = '1';
                            }}
                            onMouseOut={(e) => {
                                  e.currentTarget.style.opacity = '0';
                            }}
                                title={`Depth: ${player.depth_chart_order}`}>
                                  {player.depth_chart_order}
                              </div>
                              </div>
                              </div>
                            </div>
                          </div>
                        </SortableRow>
                      );
                    }
                    return null;
                  })}
                </SortableContext>
              </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
