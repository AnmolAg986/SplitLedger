import { pool } from '../../config/db';
import { ioInstance } from '../websocket/socketServer';

export interface PollOption {
  id: string;
  label: string;
}

export interface PollWithVotes {
  id: string;
  group_id: string;
  creator_id: string;
  creator_name: string;
  question: string;
  options: PollOption[];
  expires_at: string | null;
  created_at: string;
  /** vote counts per option_id */
  vote_counts: Record<string, number>;
  /** option_id the requesting user voted for (null if not voted) */
  my_vote: string | null;
  total_votes: number;
}

export class PollRepository {
  /** Create a new poll and broadcast it to the group room. */
  static async createPoll(
    groupId: string,
    creatorId: string,
    question: string,
    options: PollOption[],
    expiresAt?: Date
  ): Promise<PollWithVotes> {
    const res = await pool.query(
      `INSERT INTO group_polls (group_id, creator_id, question, options, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [groupId, creatorId, question, JSON.stringify(options), expiresAt ?? null]
    );
    const poll = res.rows[0];

    const creatorRes = await pool.query(
      `SELECT display_name FROM users WHERE id = $1`,
      [creatorId]
    );

    const full: PollWithVotes = {
      id: poll.id,
      group_id: poll.group_id,
      creator_id: poll.creator_id,
      creator_name: creatorRes.rows[0]?.display_name ?? 'Unknown',
      question: poll.question,
      options: poll.options,
      expires_at: poll.expires_at,
      created_at: poll.created_at,
      vote_counts: {},
      my_vote: null,
      total_votes: 0,
    };

    // Broadcast new poll to the group room
    const io = ioInstance;
    if (io) {
      io.to(`group:${groupId}`).emit('poll_created', full);
    }

    return full;
  }

  /** Cast or change a vote; broadcast updated counts. */
  static async castVote(
    pollId: string,
    userId: string,
    optionId: string
  ): Promise<PollWithVotes> {
    // Check poll is still open
    const pollRes = await pool.query(
      `SELECT * FROM group_polls WHERE id = $1`,
      [pollId]
    );
    if (!pollRes.rows[0]) throw new Error('Poll not found');
    const poll = pollRes.rows[0];
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      throw new Error('Poll has expired');
    }

    // Validate option_id
    const validIds: string[] = (poll.options as PollOption[]).map(o => o.id);
    if (!validIds.includes(optionId)) throw new Error('Invalid option');

    // Upsert vote
    await pool.query(
      `INSERT INTO group_poll_votes (poll_id, user_id, option_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = $3, voted_at = now()`,
      [pollId, userId, optionId]
    );

    const full = await this.getPoll(pollId, userId);

    // Broadcast updated vote counts
    const io = ioInstance;
    if (io) {
      io.to(`group:${poll.group_id}`).emit('poll_updated', {
        poll_id: pollId,
        vote_counts: full.vote_counts,
        total_votes: full.total_votes,
      });
    }

    return full;
  }

  /** Fetch a single poll with vote counts and the requesting user's vote. */
  static async getPoll(pollId: string, requestingUserId: string): Promise<PollWithVotes> {
    const res = await pool.query(
      `SELECT gp.*, u.display_name AS creator_name
       FROM group_polls gp
       JOIN users u ON u.id = gp.creator_id
       WHERE gp.id = $1`,
      [pollId]
    );
    if (!res.rows[0]) throw new Error('Poll not found');
    const poll = res.rows[0];

    // Aggregate vote counts
    const votesRes = await pool.query(
      `SELECT option_id, COUNT(*) AS cnt FROM group_poll_votes WHERE poll_id = $1 GROUP BY option_id`,
      [pollId]
    );
    const vote_counts: Record<string, number> = {};
    let total_votes = 0;
    for (const row of votesRes.rows) {
      vote_counts[row.option_id] = parseInt(row.cnt);
      total_votes += parseInt(row.cnt);
    }

    // Requesting user's vote
    const myVoteRes = await pool.query(
      `SELECT option_id FROM group_poll_votes WHERE poll_id = $1 AND user_id = $2`,
      [pollId, requestingUserId]
    );

    return {
      id: poll.id,
      group_id: poll.group_id,
      creator_id: poll.creator_id,
      creator_name: poll.creator_name,
      question: poll.question,
      options: poll.options,
      expires_at: poll.expires_at,
      created_at: poll.created_at,
      vote_counts,
      my_vote: myVoteRes.rows[0]?.option_id ?? null,
      total_votes,
    };
  }

  /** Paginated list of polls for a group. */
  static async getGroupPolls(
    groupId: string,
    requestingUserId: string,
    limit = 10,
    cursor?: string
  ): Promise<PollWithVotes[]> {
    const params: any[] = [groupId, limit];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor);
      cursorClause = `AND gp.created_at < $${params.length}`;
    }

    const res = await pool.query(
      `SELECT gp.id FROM group_polls gp
       WHERE gp.group_id = $1 ${cursorClause}
       ORDER BY gp.created_at DESC
       LIMIT $2`,
      params
    );

    return Promise.all(
      res.rows.map(r => this.getPoll(r.id, requestingUserId))
    );
  }
}
