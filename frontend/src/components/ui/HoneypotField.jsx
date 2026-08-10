/*
 * The hidden half of the bot trap. Driven by useHumanCheck, which owns the
 * state and the stopwatch.
 */
export default function HoneypotField({ value, onChange }) {
  return (
    /*
     * Moved off-screen rather than display:none. A hidden field is trivially
     * skipped by anything that checks, while an off-screen one has to be read
     * to be avoided.
     *
     * The accessibility attributes are not decoration. aria-hidden keeps it off
     * screen readers and tabIndex -1 keeps it out of the keyboard path, so a
     * visitor who never uses a mouse cannot land in it and get their genuine
     * demande refused. autoComplete="off" plus a name no browser recognises as
     * a real profile field is what keeps password managers from filling it in
     * on someone's behalf -- autofill is the one way this trap misfires on a
     * real person.
     */
    <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
      <label htmlFor="company_website">Ne pas remplir ce champ</label>
      <input
        type="text"
        id="company_website"
        name="company_website"
        value={value}
        onChange={onChange}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
