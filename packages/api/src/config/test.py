from packages.api.src.configbase import BaseConfig


class TestConfig(BaseConfig):
    class Config:
        env_file = ".env.test"

    APP_NAME: str = "Maintenance API (Test)"
    DEBUG: bool = True
