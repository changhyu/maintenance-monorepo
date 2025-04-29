#!/usr/bin/env python
"""
FastAPI 스키마에서 TypeScript 인터페이스 자동 생성 스크립트

이 스크립트는 FastAPI Pydantic 모델을 분석하여 해당하는 TypeScript 인터페이스를 생성합니다.
프론트엔드와 백엔드 간의 타입 일관성을 유지하는 데 도움이 됩니다.
"""
import importlib
import importlib.util
import inspect
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Union

# 현재 디렉토리를 sys.path에 추가하여 모듈 임포트 가능하게 함
current_dir = os.path.dirname(os.path.realpath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.insert(0, root_dir)

# 필요한 라이브러리 임포트
try:
    import yaml
    from fastapi import FastAPI
    from fastapi.openapi.utils import get_openapi
    from pydantic import BaseModel
except ImportError:
    print("필요한 라이브러리가 없습니다. 아래 명령어로 설치하세요.")
    print("pip install fastapi pydantic pyyaml")
    sys.exit(1)

# Python 타입을 TypeScript 타입으로 변환
TYPE_MAPPING = {
    "str": "string",
    "int": "number",
    "float": "number",
    "bool": "boolean",
    "list": "Array<any>",
    "dict": "Record<string, any>",
    "Dict": "Record<string, any>",
    "List": "Array<any>",
    "Any": "any",
    "Optional": "null | ",  # 특수 처리 필요
    "Union": "",  # 특수 처리 필요
    "datetime": "string",  # ISO 날짜 문자열로 처리
    "date": "string",
    "time": "string",
    "timedelta": "string",
    "UUID": "string",
    "EmailStr": "string",
    "FileUpload": "File",
    "bytes": "string",
    "BytesIO": "Blob",
}


class TypeScriptInterfaceGenerator:
    """TypeScript 인터페이스 생성기 클래스"""

    def __init__(
        self, output_dir: str, app_module_path: str = None, verbose: bool = False
    ):
        """
        TypeScript 인터페이스 생성기 초기화

        Args:
            output_dir: 생성된 TypeScript 파일이 저장될 디렉토리 경로
            app_module_path: FastAPI 애플리케이션 모듈 경로 (직접 지정 시)
            verbose: 상세 로그 출력 여부
        """
        self.output_dir = os.path.abspath(output_dir)
        self.app_module_path = app_module_path
        self.verbose = verbose
        self.models_dict = {}
        self.processed_models = set()
        self.imports = set()

        # 출력 디렉토리 생성
        os.makedirs(self.output_dir, exist_ok=True)

    def _log(self, message: str):
        """로그 메시지 출력 (verbose 모드인 경우만)"""
        if self.verbose:
            print(f"[INFO] {message}")

    def extract_models_from_routers(self, routers_dir: str):
        """
        라우터 디렉토리에서 Pydantic 모델 추출

        Args:
            routers_dir: 라우터 모듈이 있는 디렉토리 경로
        """
        self._log(f"라우터 디렉토리 분석 중: {routers_dir}")
        routers_path = Path(routers_dir)

        # 모든 Python 파일 검색
        for py_file in routers_path.glob("**/*.py"):
            if py_file.name.startswith("__"):
                continue

            module_path = (
                str(py_file.relative_to(root_dir))
                .replace("/", ".")
                .replace("\\", ".")[:-3]
            )
            self._log(f"모듈 분석 중: {module_path}")

            try:
                module = importlib.import_module(module_path)

                # 모듈의 모든 클래스 검사
                for name, obj in inspect.getmembers(module):
                    if (
                        inspect.isclass(obj)
                        and issubclass(obj, BaseModel)
                        and obj != BaseModel
                    ):
                        self._log(f"모델 발견: {name}")
                        self.process_model(name, obj)
            except ImportError as e:
                print(f"모듈 import 중 오류 발생: {module_path} - {e}")
            except Exception as e:
                print(f"모듈 처리 중 오류 발생: {module_path} - {e}")

    def extract_models_from_openapi(self, app_instance: Optional[FastAPI] = None):
        """
        FastAPI OpenAPI 스키마에서 모델 정보 추출

        Args:
            app_instance: 직접 제공된 FastAPI 앱 인스턴스
        """
        app = app_instance
        if not app and self.app_module_path:
            try:
                sys.path.insert(0, os.path.dirname(self.app_module_path))
                spec = importlib.util.spec_from_file_location(
                    "app_module", self.app_module_path
                )
                app_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(app_module)

                # app 인스턴스 찾기
                for attr_name in dir(app_module):
                    attr = getattr(app_module, attr_name)
                    if isinstance(attr, FastAPI):
                        app = attr
                        break
            except Exception as e:
                print(f"FastAPI 애플리케이션 로드 중 오류 발생: {e}")
                return

        if not app:
            print("FastAPI 애플리케이션을 찾을 수 없습니다.")
            return

        # OpenAPI 스키마 생성
        openapi_schema = get_openapi(
            title=getattr(app, "title", "API"),
            version=getattr(app, "version", "1.0.0"),
            routes=app.routes,
        )

        # 스키마에서 컴포넌트 추출
        if "components" in openapi_schema and "schemas" in openapi_schema["components"]:
            schemas = openapi_schema["components"]["schemas"]

            for schema_name, schema in schemas.items():
                # openapi 스키마를 TypeScript 인터페이스로 변환
                self._log(f"OpenAPI 스키마에서 발견된 모델: {schema_name}")
                self.process_openapi_schema(schema_name, schema)

    def process_model(self, model_name: str, model_class):
        """
        Pydantic 모델을 처리하여 TypeScript 인터페이스 정보 추출

        Args:
            model_name: 모델 클래스 이름
            model_class: Pydantic 모델 클래스
        """
        if model_name in self.processed_models:
            return

        self.processed_models.add(model_name)

        # 모델 필드 및 타입 정보 추출
        model_fields = {}
        for field_name, field in model_class.__fields__.items():
            field_info = {
                "type": self._get_typescript_type(field.type_),
                "description": field.field_info.description,
                "required": field.required,
            }
            model_fields[field_name] = field_info

            # 중첩 모델 처리
            if hasattr(field.type_, "__fields__"):
                nested_model_name = field.type_.__name__
                nested_model_class = field.type_
                self.process_model(nested_model_name, nested_model_class)

        # 모델 정보 저장
        self.models_dict[model_name] = {
            "fields": model_fields,
            "description": model_class.__doc__,
        }

    def process_openapi_schema(self, schema_name: str, schema: Dict[str, Any]):
        """
        OpenAPI 스키마를 처리하여 TypeScript 인터페이스 정보 추출

        Args:
            schema_name: 스키마 이름
            schema: OpenAPI 스키마 객체
        """
        if schema_name in self.processed_models:
            return

        self.processed_models.add(schema_name)

        model_fields = {}
        required_fields = schema.get("required", [])

        if "properties" in schema:
            for field_name, field_schema in schema["properties"].items():
                field_type = self._convert_openapi_type(field_schema)
                field_info = {
                    "type": field_type,
                    "description": field_schema.get("description", ""),
                    "required": field_name in required_fields,
                }
                model_fields[field_name] = field_info

        self.models_dict[schema_name] = {
            "fields": model_fields,
            "description": schema.get("description", ""),
        }

    def _convert_openapi_type(self, field_schema: Dict[str, Any]) -> str:
        """
        OpenAPI 타입을 TypeScript 타입으로 변환

        Args:
            field_schema: OpenAPI 필드 스키마

        Returns:
            변환된 TypeScript 타입
        """
        schema_type = field_schema.get("type")
        if not schema_type and "$ref" in field_schema:
            # 참조 타입 처리
            ref_path = field_schema["$ref"]
            ref_type = ref_path.split("/")[-1]
            return ref_type

        if schema_type == "array":
            item_type = "any"
            if "items" in field_schema:
                item_type = self._convert_openapi_type(field_schema["items"])
            return f"Array<{item_type}>"

        if schema_type == "object":
            if "additionalProperties" in field_schema:
                value_type = self._convert_openapi_type(
                    field_schema["additionalProperties"]
                )
                return f"Record<string, {value_type}>"
            return "Record<string, any>"

        # 기본 타입 매핑
        type_mappings = {
            "string": "string",
            "integer": "number",
            "number": "number",
            "boolean": "boolean",
            "null": "null",
        }

        # 형식 특별 처리
        if schema_type == "string" and "format" in field_schema:
            format_type = field_schema["format"]
            if format_type in ("date", "date-time", "time"):
                return "string"
            if format_type == "binary":
                return "Blob"
            if format_type == "email":
                return "string"

        return type_mappings.get(schema_type, "any")

    def _get_typescript_type(self, python_type) -> str:
        """
        Python 타입을 TypeScript 타입으로 변환

        Args:
            python_type: Python 타입 객체

        Returns:
            변환된 TypeScript 타입 문자열
        """
        type_name = getattr(python_type, "__name__", str(python_type))
        origin = getattr(python_type, "__origin__", None)
        args = getattr(python_type, "__args__", None)

        # 기본 타입 변환
        if type_name in TYPE_MAPPING:
            return TYPE_MAPPING[type_name]

        # 리스트 타입 처리
        if origin == list or type_name == "List":
            if args:
                item_type = self._get_typescript_type(args[0])
                return f"Array<{item_type}>"
            return "Array<any>"

        # 딕셔너리 타입 처리
        if origin == dict or type_name == "Dict":
            if args and len(args) >= 2:
                key_type = self._get_typescript_type(args[0])
                value_type = self._get_typescript_type(args[1])
                if key_type == "string":
                    return f"Record<string, {value_type}>"
            return "Record<string, any>"

        # Union 타입 처리
        if origin == Union or type_name == "Union":
            if args:
                # None/Optional 처리
                if type(None) in args:
                    non_none_args = [arg for arg in args if arg is not type(None)]
                    if len(non_none_args) == 1:
                        return f"{self._get_typescript_type(non_none_args[0])} | null"

                # 일반 Union 타입
                union_types = [self._get_typescript_type(arg) for arg in args]
                return " | ".join(union_types)

        # 사용자 정의 타입(Pydantic 모델)인 경우 타입 이름 그대로 사용
        if hasattr(python_type, "__fields__"):
            self.imports.add(type_name)  # 임포트 목록에 추가
            return type_name

        # 기본값으로 any 반환
        return "any"

    def generate_typescript_interfaces(self):
        """
        추출된 모델 정보를 기반으로 TypeScript 인터페이스 파일 생성
        """
        # models.ts 파일 생성
        output_path = os.path.join(self.output_dir, "api-models.ts")
        self._log(f"TypeScript 인터페이스 파일 생성 중: {output_path}")

        with open(output_path, "w", encoding="utf-8") as f:
            # 파일 헤더
            f.write("/**\n")
            f.write(" * 자동 생성된 API 모델 타입 정의 파일\n")
            f.write(f" * 생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(
                " * 이 파일을 직접 수정하지 마세요. 변경 시 스크립트를 통해 재생성해주세요.\n"
            )
            f.write(" */\n\n")

            # 임포트 구문 (필요한 경우)

            # 인터페이스 생성
            for model_name, model_info in self.models_dict.items():
                description = model_info.get("description", "")
                fields = model_info.get("fields", {})

                # 주석 추가
                if description:
                    f.write("/**\n")
                    for line in description.strip().split("\n"):
                        f.write(f" * {line.strip()}\n")
                    f.write(" */\n")
                else:
                    f.write(f"/** {model_name} 인터페이스 */\n")

                # 인터페이스 선언
                f.write(f"export interface {model_name} {{\n")

                # 필드 추가
                for field_name, field_info in fields.items():
                    field_type = field_info.get("type", "any")
                    field_description = field_info.get("description", "")
                    required = field_info.get("required", True)

                    # 필드 주석
                    if field_description:
                        f.write(f"  /** {field_description} */\n")

                    # 필드 선언 (선택적 필드는 ? 추가)
                    optional_mark = "" if required else "?"
                    f.write(f"  {field_name}{optional_mark}: {field_type};\n")

                f.write("}\n\n")

        print(f"✅ TypeScript 인터페이스 파일이 생성되었습니다: {output_path}")


# 메인 실행 코드
if __name__ == "__main__":
    # 커맨드라인 인수 파싱
    import argparse

    parser = argparse.ArgumentParser(
        description="FastAPI 모델에서 TypeScript 인터페이스 생성"
    )
    parser.add_argument(
        "--output", "-o", default="../frontend/src/types", help="출력 디렉토리 경로"
    )
    parser.add_argument(
        "--routers", "-r", default="./src/routers", help="라우터 디렉토리 경로"
    )
    parser.add_argument("--app", "-a", help="FastAPI 앱 모듈 경로 (예: src/main.py)")
    parser.add_argument("--verbose", "-v", action="store_true", help="상세 출력 모드")

    args = parser.parse_args()

    # 생성기 초기화
    generator = TypeScriptInterfaceGenerator(
        output_dir=args.output, app_module_path=args.app, verbose=args.verbose
    )

    # 모델 추출 및 인터페이스 생성
    generator.extract_models_from_routers(args.routers)

    if args.app:
        generator.extract_models_from_openapi()

    generator.generate_typescript_interfaces()
