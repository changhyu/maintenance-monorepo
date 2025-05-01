#!/usr/bin/env python
"""
Git 서비스 패키지 설정 스크립트

이 스크립트는 gitmanager 패키지를 설치하기 위한 설정을 정의합니다.
"""

import os
import sys
from setuptools import setup, find_packages

# 최소 Python 버전 확인
if sys.version_info < (3, 7):
    sys.exit('Python 3.7 이상이 필요합니다.')

# 현재 디렉토리
here = os.path.abspath(os.path.dirname(__file__))

# README 파일 읽기
try:
    with open(os.path.join(here, 'README.md'), encoding='utf-8') as f:
        long_description = f.read()
except FileNotFoundError:
    long_description = '표준화된 Git 저장소 관리 서비스 패키지'

# 패키지 메타데이터
setup(
    name='gitmanager',
    version='0.3.0',
    description='Git 저장소 관리를 위한 표준화된 인터페이스',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/yourusername/maintenance-monorepo',
    author='팀 C',
    author_email='team@example.com',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Topic :: Software Development :: Version Control :: Git',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
    ],
    keywords='git, version control, management',
    packages=find_packages(exclude=['tests', 'tests.*']),
    python_requires='>=3.7, <4',
    install_requires=[
        'gitpython>=3.1.0',
        'pydantic>=1.8.0',
        'typing_extensions>=4.0.0',
    ],
    extras_require={
        'dev': [
            'pytest>=6.0.0',
            'pytest-cov>=2.10.0',
            'black>=20.8b1',
            'isort>=5.0.0',
            'mypy>=0.800',
        ],
        'test': [
            'pytest>=6.0.0',
            'pytest-cov>=2.10.0',
        ],
    },
    entry_points={
        'console_scripts': [
            'gitmanager=gitmanager.cli:main',
        ],
    },
    project_urls={
        'Bug Reports': 'https://github.com/yourusername/maintenance-monorepo/issues',
        'Documentation': 'https://github.com/yourusername/maintenance-monorepo/tree/main/packages/git-service',
    },
) 