import { AttributionModal } from './AttributionModal.jsx';
import { AttackShortcutModal } from './AttackShortcutModal.jsx';
import { VideoEditModal } from './VideoEditModal.jsx';
import { StartupError } from "./StartupError.jsx";
import { CourtModalPortal } from "./CourtModalPortal.jsx";
import { UpdateBanner } from "./layout/UpdateBanner.jsx";
import { AppNavigation } from "./layout/AppNavigation.jsx";
import { MobileNavigation } from "./layout/MobileNavigation.jsx";
import { BtnToggleTopbar } from "./layout/BtnToggleTopbar.jsx";
import { MatchPage } from "./layout/MatchPage.jsx";
import { AppDialogs } from "./AppDialogs.jsx";
import { InfoPage } from "./layout/InfoPage.jsx";
import { ScoutPage } from "./layout/ScoutPage.jsx";
import { AggregatedPage } from "./layout/AggregatedPage.jsx";
import { VideoPage } from "./layout/VideoPage.jsx";
import { VideoMobileSourceModal } from "./layout/VideoMobileSourceModal.jsx";
import { AppSection } from "./layout/AppSection.jsx";
import { TeamManagerModal } from "./layout/TeamManagerModal.jsx";
import { PastePlayersModal } from "./layout/PastePlayersModal.jsx";
import { Camp3ConfirmModal } from "./layout/Camp3ConfirmModal.jsx";
import { SkillModal } from "./layout/SkillModal.jsx";
import { AggSkillModal } from "./layout/AggSkillModal.jsx";
import { BulkEditModal } from "./layout/BulkEditModal.jsx";
import { VideoScoreModal } from "./layout/VideoScoreModal.jsx";
import { SetStartModal } from "./layout/SetStartModal.jsx";
import { LineupModal } from "./layout/LineupModal.jsx";
import { AttackTrajectoryModal } from "./layout/AttackTrajectoryModal.jsx";
import { DebugModal } from "./layout/DebugModal.jsx";
import { NewMatchModal } from "./layout/NewMatchModal.jsx";
import { TeamsManagerModal } from "./layout/TeamsManagerModal.jsx";
import { PlayersDbModal } from "./layout/PlayersDbModal.jsx";
import { PlayerPhotoModal } from "./layout/PlayerPhotoModal.jsx";
import { SettingsModal } from "./layout/SettingsModal.jsx";
import { MultiscoutModal } from "./layout/MultiscoutModal.jsx";
import { FfmpegEncoderModal } from "./layout/FfmpegEncoderModal.jsx";
import { FloatingServeErrorBtn } from "./layout/FloatingServeErrorBtn.jsx";
import { AppFooter } from "./layout/AppFooter.jsx";

import { memo } from "react";

export const AppLayout = memo(function AppLayout() {
  return (
    <>
      <StartupError />
      <UpdateBanner />
      <AppNavigation />
      <MobileNavigation />
      <BtnToggleTopbar />
      <MatchPage />
      <InfoPage />
      <ScoutPage />
      <AggregatedPage />
      <VideoPage />
      <VideoMobileSourceModal />
      <AppSection />
      <TeamManagerModal />
      <PastePlayersModal />
      <Camp3ConfirmModal />
      <CourtModalPortal>
        <SkillModal />
      </CourtModalPortal>
      <AggSkillModal />
      <AttackShortcutModal kind="base" />
      <AttackShortcutModal kind="type" />
      <AttackShortcutModal kind="setter" />
      <AttackShortcutModal kind="block" />
      <BulkEditModal />
      <VideoScoreModal />
      <SetStartModal />
      <CourtModalPortal>
        <LineupModal />
      </CourtModalPortal>
      <CourtModalPortal>
        <AttributionModal kind="error" />
      </CourtModalPortal>
      <CourtModalPortal>
        <AttributionModal kind="point" />
      </CourtModalPortal>
      <CourtModalPortal>
        <AttackTrajectoryModal />
      </CourtModalPortal>
      <DebugModal />
      <NewMatchModal />
      <TeamsManagerModal />
      <PlayersDbModal />
      <PlayerPhotoModal />
      <SettingsModal />
      <VideoEditModal kind="offset" />
      <VideoEditModal kind="unify" />
      <MultiscoutModal />
      <VideoEditModal kind="duration" />
      <FfmpegEncoderModal />
      <FloatingServeErrorBtn />
      <AppFooter />
      <AppDialogs />
    </>
  );
});
