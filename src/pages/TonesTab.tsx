import GenericConfigTab from "../components/GenericConfigTab";
import defaultTones from "../data/default_tones.json";
import noTonesBanner from "../assets/images/No_Tones_Banner.png";

export default function TonesTab() {
  return (
    <GenericConfigTab
      title="TONES & STYLES"
      description="Define the specific voice, vocabulary, and formatting rules the AI should adopt."
      bannerImage={noTonesBanner}
      bannerTitle="Create your first tone!"
      bannerText="Tones dictate how the text should sound—formal, casual, poetic, or structured."
      isGrid={true}
      f1Key="name"
      f2Key="prompt"
      f1Placeholder="Tone Name"
      f2Placeholder="Tone Prompt"
      getCmd="get_tones"
      addCmd="add_tone_entry"
      updateCmd="update_tone_entry"
      deleteCmd="delete_tone_entry"
      defaultData={defaultTones}
      f2Type="textarea"
      modalDescription="Define a tone and its post-processing style rewriting instructions."
    />
  );
}
