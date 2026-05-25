import GenericConfigTab from "../components/GenericConfigTab";
import defaultModes from "../data/default_modes.json";
import noModesBanner from "../assets/images/No_Modes_Banner.png";

export default function ModesTab() {
  return (
    <GenericConfigTab
      title="CUSTOM MODES"
      description="Create distinct transcription profiles tailored for specific workflows like coding or journaling."
      bannerImage={noModesBanner}
      bannerTitle="Create your first custom mode!"
      bannerText="Modes allow you to define a specific prompt block that acts as a persona or instruction set for your dictations."
      isGrid={true}
      f1Key="name"
      f2Key="prompt"
      f1Placeholder="Mode Name"
      f2Placeholder="System Prompt"
      getCmd="get_modes"
      addCmd="add_mode_entry"
      updateCmd="update_mode_entry"
      deleteCmd="delete_mode_entry"
      defaultData={defaultModes}
      f2Type="textarea"
      modalDescription="Define a mode and its structural output format wrapper."
    />
  );
}
