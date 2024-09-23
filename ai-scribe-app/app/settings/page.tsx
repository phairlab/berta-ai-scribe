import { title } from "@/components/primitives";
import { NoteDefinitionConfigurator } from "@/components/note-definition-configurator";

export default function Settings() {
  return (
    <section className="flex flex-col items-center justify-center gap-10 py-2">
      <h1 className={title()}>Settings</h1>
      <NoteDefinitionConfigurator />
    </section>
  );
}
