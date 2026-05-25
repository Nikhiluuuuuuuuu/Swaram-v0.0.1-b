import GenericConfigTab from "../components/GenericConfigTab";
import noSnippetsBanner from "../assets/images/No_Snippets_Banner.png";

export default function SnippetsTab() {
  return (
    <GenericConfigTab
      title="TEXT SNIPPETS"
      description="Create text expansions that trigger when you speak specific keywords."
      bannerImage={noSnippetsBanner}
      bannerTitle="Create your first text snippet!"
      bannerText="Snippets let you type a short keyword that automatically expands into a longer phrase or template."
      isGrid={false}
      f1Key="keyword"
      f2Key="text"
      f1Placeholder="Keyword (e.g. '!brb')"
      f2Placeholder="Expansion (e.g. 'Be right back!')"
      getCmd="get_snippets"
      addCmd="add_snippet_entry"
      updateCmd="update_snippet_entry"
      deleteCmd="delete_snippet_entry"
      f2Type="textarea"
      modalDescription="Define a shortcode trigger (e.g. '!brb') and its full text expansion."
    />
  );
}
