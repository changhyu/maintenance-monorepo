from setuptools import setup, find_packages

setup(
    name="maintenance-shared-python",
    version="0.1.0",
    author="Maintenance Team",
    author_email="team@example.com",
    description="Shared Python utilities for maintenance project",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/maintenance-monorepo",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
    install_requires=[
        "pydantic>=2.0.0",
        "requests>=2.25.0",
        "PyJWT>=2.3.0",
    ],
)