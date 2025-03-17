// Not exactly the best code, but it does the job

export default {
	async fetch(request, env, ctx) {

		const isInt = (value) => {
			return !isNaN(value) && (function (x) { return (x | 0) === x; })(parseFloat(value));
		}

		const verifyRoom = async (id, password) => {
			if (!isInt(id) || !password.match(/^[0-9a-zA-Z]+$/)) return false;

			const statement = env.DB.prepare(`SELECT * FROM rooms WHERE id = ? AND password = ?`).bind(id, password);
			const result = await statement.run();

			return !!result.results.length;
		}

		const getRoomName = async (id) => {
			if (!isInt(id)) return false;

			const statement = env.DB.prepare(`SELECT * FROM rooms WHERE id = ?`).bind(id);
			const result = await statement.run();

			if (result.results.length) {
				return result.results[0].name;
			}
			return "";
		}

		const putScore = async (room, score, username, data, timestamp) => {
			if (!username.match(/^[0-9a-zA-Z]+$/)) return false;
			let statement;
			if (username) {
				statement = env.DB.prepare(`INSERT INTO scores (room, score, username, data, timestamp) VALUES (?, ?, ?, ?, ?)`).bind(room, score, username, data, timestamp);
			} else {
				statement = env.DB.prepare(`INSERT INTO scores (room, score, data, timestamp) VALUES (?, ?, ?, ?, ?)`).bind(room, score, data, timestamp);
			}
			return await statement.run();
		}

		const getRank = async (id) => {
			const statement = env.DB.prepare(`SELECT t1.username, t1.score, t1.id, t2.rank FROM scores t1 INNER JOIN ( SELECT t1.score, (SELECT COUNT(*) FROM (SELECT DISTINCT score FROM scores) t2 WHERE t2.score >= t1.score) rank FROM (SELECT DISTINCT score FROM scores) t1) t2 ON t1.score = t2.score WHERE t1.id = ? ORDER BY rank;`).bind(id);
			const result = await statement.run();

			if (result.success) {
				return result.results[0].rank;
			} else {
				return -1;
			}
		}

		if (request.method === "PUT") {
			const data = await request.json();
			const verified = await verifyRoom(parseInt(data.room.id), data.room.password);

			if (verified) {
				let score = 0;

				for (let i = 0; i < data.holes.length; i++) {
					if (data.holes[i] = data.choices[i]) {
						score++;
					}
				}

				const result = await putScore(data.room.id, score, (data.username.length > 0 ? data.username : undefined), JSON.stringify(data), Date.now());

				if (result?.success) {
					const id = result.meta.last_row_id;
					const rank = await getRank(id);
					return new Response(JSON.stringify({ id, rank }), {
						status: 201
					});
				} else {
					return new Response(null, {
						status: 500
					});
				}
			} else {
				return new Response(null, {
					status: 401
				});
			}
		} else if (request.method === "GET") {
			return new Response("Leaderboard TBD");
		} else if (request.method === "POST") {
			const data = await request.json();
			const verified = await verifyRoom(parseInt(data.room.id), data.room.password);

			if (verified) {
				const name = await getRoomName(data.room.id);
				return new Response(JSON.stringify({ name }), {
					status: 406
				});
			} else {
				return new Response(null, {
					status: 406
				});
			}
		}
	},
};
