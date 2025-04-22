from packages.api.src.configbase import BaseConfig


class ProductionConfig(BaseConfig):
    class Config:
        env_file = ".env.production"

    APP_NAME: str = "Maintenance API"
    DEBUG: bool = False
