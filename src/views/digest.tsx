import type { DigestRow, NightDigest } from '../digest/types.js';

const MISSING = '\u2014';

function isMarked(row: DigestRow): boolean {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

export function DigestPage(props: { night: string; digest: NightDigest }) {
  const { night, digest } = props;
  if (digest.empty) {
    return (
      <>
        <h1>digest · {night}</h1>
        <p>nothing ran</p>
      </>
    );
  }
  return (
    <>
      <h1>digest · {night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>last error</th>
            <th>first</th>
            <th>last</th>
          </tr>
        </thead>
        <tbody>
          {digest.rows.map((row) => (
            <tr class={isMarked(row) ? 'warn' : undefined} data-job={row.job}>
              <td>{row.job}</td>
              <td>{row.owner ?? MISSING}</td>
              <td>{row.runs}</td>
              <td>{row.retries}</td>
              <td>{row.lastStatus}</td>
              <td>{row.lastError ?? MISSING}</td>
              <td>{row.firstAt}</td>
              <td>{row.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
