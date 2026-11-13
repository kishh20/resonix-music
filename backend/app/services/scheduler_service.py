import asyncio
import logging
import time
from app.services.discovery_service import discovery_service

logger = logging.getLogger(__name__)

# Frequencies in seconds
INTERVAL_NEW_RELEASES = 2 * 60 * 60     # Every 2 hours
INTERVAL_DAILY_REFRESH = 24 * 60 * 60    # Daily
INTERVAL_WEEKLY_VERIFY = 7 * 24 * 60 * 60 # Weekly

class CatalogueScheduler:
    def __init__(self):
        self._running = False
        self._task: asyncio.Task | None = None
        self._last_discovery = 0.0
        self._last_daily = 0.0
        self._last_weekly = 0.0

    async def _loop(self):
        logger.info("Catalogue automated background scheduler started.")
        # Run initial discovery sync shortly after boot if catalogue is empty
        await asyncio.sleep(5)
        if len(discovery_service.tracks) < 10:
            try:
                logger.info("Catalogue is empty. Running initial music discovery seeding...")
                await discovery_service.run_full_discovery_sync()
                self._last_discovery = time.time()
                self._last_daily = time.time()
                self._last_weekly = time.time()
            except Exception as e:
                logger.warning(f"Initial discovery seeding error: {e}")

        while self._running:
            try:
                now = time.time()

                # 1. Check for new releases every 2 hours
                if now - self._last_discovery >= INTERVAL_NEW_RELEASES:
                    logger.info("Triggering scheduled 2-hour new releases discovery...")
                    await discovery_service.run_full_discovery_sync()
                    self._last_discovery = time.time()

                # 2. Check for daily metadata refresh
                if now - self._last_daily >= INTERVAL_DAILY_REFRESH:
                    logger.info("Triggering scheduled daily metadata refresh...")
                    await discovery_service.discover_audius_releases(limit=50)
                    self._last_daily = time.time()

                # 3. Check for weekly stream link health verification
                if now - self._last_weekly >= INTERVAL_WEEKLY_VERIFY:
                    logger.info("Triggering scheduled weekly streaming links verification...")
                    await discovery_service.verify_streaming_links(sample_size=30)
                    self._last_weekly = time.time()

            except Exception as e:
                logger.error(f"Error in catalogue scheduler loop: {e}")

            # Sleep 60 seconds before next interval check
            await asyncio.sleep(60)

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())

    def stop(self):
        if self._running:
            self._running = False
            if self._task:
                self._task.cancel()
            logger.info("Catalogue automated scheduler stopped.")

catalogue_scheduler = CatalogueScheduler()
