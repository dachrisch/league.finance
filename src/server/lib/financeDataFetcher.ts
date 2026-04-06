import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import type { IFinancialConfig } from '../models/FinancialConfig';
import type { IFinancialSettings } from '../models/FinancialSettings';
import type { CalculationTeam, ParticipationEntry } from './financeCalculator';

export function resolveBaseRate(
  config: IFinancialConfig,
  settings: IFinancialSettings
): number {
  return (
    config.baseRateOverride ??
    (config.costModel === 'SEASON'
      ? settings.defaultRatePerTeamSeason
      : settings.defaultRatePerTeamGameday)
  );
}

export async function fetchMysqlData(
  pool: Pool,
  config: IFinancialConfig
): Promise<{ teams: CalculationTeam[]; participation: ParticipationEntry[] }> {
  if (config.costModel === 'SEASON') {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.name FROM gamedays_team t
       JOIN gamedays_seasonleagueteam_teams st ON st.team_id = t.id
       JOIN gamedays_seasonleagueteam slt ON slt.id = st.seasonleagueteam_id
       WHERE slt.league_id = ? AND slt.season_id = ? AND t.location != 'dummy'`,
      [config.leagueId, config.seasonId]
    );
    return { teams: rows as CalculationTeam[], participation: [] };
  }

  // GAMEDAY model
  const [gamedays] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM gamedays_gameday WHERE league_id = ? AND season_id = ?',
    [config.leagueId, config.seasonId]
  );

  const participation: ParticipationEntry[] = [];

  for (const gd of gamedays) {
    const [playing] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT gr.team_id as id FROM gamedays_gameresult gr
       JOIN gamedays_gameinfo gi ON gi.id = gr.gameinfo_id
       JOIN gamedays_team t ON t.id = gr.team_id
       WHERE gi.gameday_id = ? AND t.location != 'dummy'`,
      [gd.id]
    );
    const [officiating] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT gi.officials_id as id FROM gamedays_gameinfo gi
       JOIN gamedays_team t ON t.id = gi.officials_id
       WHERE gi.gameday_id = ? AND t.location != 'dummy' AND gi.officials_id IS NOT NULL`,
      [gd.id]
    );
    const teamIds = [
      ...new Set([
        ...playing.map((r) => r.id as number),
        ...officiating.map((r) => r.id as number),
      ]),
    ].filter(Boolean);
    participation.push({ gamedayId: gd.id as number, teamIds });
  }

  return { teams: [], participation };
}
